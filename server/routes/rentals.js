const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/rentals/active - Active rentals with customer and items detail
router.get('/active', async (req, res) => {
  try {
    const query = `
      SELECT
        r.rental_id,
        r.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        r.staff_id,
        st.full_name AS staff_name,
        r.insurance_id,
        i.plan_name AS insurance_name,
        i.fee_rate AS insurance_fee_rate,
        r.start_date,
        r.end_date,
        r.deposit_amount,
        r.total_rental_fee,
        r.total_damage_fee,
        r.rental_status,
        COALESCE(
          json_agg(
            json_build_object(
              'rental_item_id', ri.rental_item_id,
              'equipment_id', ri.equipment_id,
              'equipment_name', e.equipment_name,
              'serial_number', e.serial_number,
              'snapshot_daily_rate', ri.snapshot_daily_rate,
              'returned_at', ri.returned_at
            ) ORDER BY ri.rental_item_id
          ) FILTER (WHERE ri.rental_item_id IS NOT NULL),
          '[]'
        ) AS items
      FROM rentals r
      JOIN customers c ON c.customer_id = r.customer_id
      JOIN staff st ON st.staff_id = r.staff_id
      JOIN insurance i ON i.insurance_id = r.insurance_id
      LEFT JOIN rental_items ri ON ri.rental_id = r.rental_id
      LEFT JOIN equipment e ON e.equipment_id = ri.equipment_id
      WHERE r.rental_status = 'Active'
      GROUP BY r.rental_id, c.customer_id, c.full_name, c.phone, c.email, st.staff_id, st.full_name, i.insurance_id, i.plan_name, i.fee_rate
      ORDER BY r.rental_id DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rentals - List rentals (optional status/customer_id filter)
router.get('/', async (req, res) => {
  try {
    const { rental_status, customer_id, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT r.rental_id, r.customer_id, c.full_name AS customer_name,
             r.staff_id, s.full_name AS staff_name,
             r.insurance_id, i.plan_name AS insurance_name,
             r.start_date, r.end_date, r.deposit_amount,
             r.total_rental_fee, r.total_damage_fee, r.rental_status
        FROM rentals r
        JOIN customers c ON c.customer_id = r.customer_id
        JOIN staff s ON s.staff_id = r.staff_id
        JOIN insurance i ON i.insurance_id = r.insurance_id
       WHERE 1=1
    `;
    const params = [];

    if (rental_status) {
      params.push(rental_status);
      query += ` AND r.rental_status = $${params.length}`;
    }
    if (customer_id) {
      params.push(customer_id);
      query += ` AND r.customer_id = $${params.length}`;
    }

    params.push(parseInt(limit, 10));
    query += ` ORDER BY r.rental_id DESC LIMIT $${params.length}`;

    params.push(parseInt(offset, 10));
    query += ` OFFSET $${params.length}`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rentals/:id - Single rental details with items, inspections, and payments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rentalQuery = `
      SELECT r.rental_id, r.customer_id, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
             r.staff_id, s.full_name AS staff_name,
             r.insurance_id, i.plan_name AS insurance_name, i.fee_rate AS insurance_fee_rate,
             r.start_date, r.end_date, r.deposit_amount,
             r.total_rental_fee, r.total_damage_fee, r.rental_status
        FROM rentals r
        JOIN customers c ON c.customer_id = r.customer_id
        JOIN staff s ON s.staff_id = r.staff_id
        JOIN insurance i ON i.insurance_id = r.insurance_id
       WHERE r.rental_id = $1
    `;
    const { rows: rentalRows } = await db.query(rentalQuery, [id]);
    if (rentalRows.length === 0) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    const itemsQuery = `
      SELECT ri.rental_item_id, ri.equipment_id, e.equipment_name, e.serial_number,
             ri.snapshot_daily_rate, ri.returned_at,
             il.inspection_log_id, il.condition_note, il.damage_fee, il.repair_cost, il.inspection_date
        FROM rental_items ri
        JOIN equipment e ON e.equipment_id = ri.equipment_id
        LEFT JOIN inspection_logs il ON il.rental_item_id = ri.rental_item_id
       WHERE ri.rental_id = $1
       ORDER BY ri.rental_item_id ASC
    `;
    const { rows: itemsRows } = await db.query(itemsQuery, [id]);

    const paymentsQuery = `
      SELECT payment_id, payment_type, amount, payment_method, payment_date
        FROM payments
       WHERE rental_id = $1
       ORDER BY payment_id ASC
    `;
    const { rows: paymentsRows } = await db.query(paymentsQuery, [id]);

    res.json({
      ...rentalRows[0],
      items: itemsRows,
      payments: paymentsRows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rentals - Create rental via sp_create_equipment_rental
// Express must CALL outside BEGIN transaction block per spec
router.post('/', async (req, res) => {
  try {
    const {
      customer_id,
      staff_id,
      insurance_id,
      start_date,
      end_date,
      equipment_ids,
      deposit_amount,
      payment_method,
    } = req.body;

    if (!customer_id || !staff_id || !insurance_id || !start_date || !end_date) {
      return res.status(400).json({
        error: 'customer_id, staff_id, insurance_id, start_date, and end_date are required',
      });
    }

    if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return res.status(400).json({
        error: 'equipment_ids must be a non-empty array of IDs',
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        error: 'payment_method is required for deposit',
      });
    }

    // Call stored procedure: INOUT p_rental_id returned in rows
    const spResult = await db.query(
      'CALL sp_create_equipment_rental($1, $2, $3, $4, $5, $6, $7, $8, NULL)',
      [
        customer_id,
        staff_id,
        insurance_id,
        start_date,
        end_date,
        equipment_ids,
        deposit_amount || 0,
        payment_method,
      ]
    );

    const rental_id = spResult.rows && spResult.rows[0] ? spResult.rows[0].p_rental_id : null;

    res.status(201).json({
      message: 'Rental created successfully',
      rental_id,
    });
  } catch (err) {
    // Return RAISE EXCEPTION message with 400 status per spec
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
