const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/returns - Process equipment return & inspection inside a transaction
// Spec: INSERT inspection_logs (fires trigger) + set returned_at + equipment.status='Available'
//       + if all items returned: rental_status='Completed' + INSERT payments('Settlement'/'Fine')
router.post('/', async (req, res) => {
  const { rental_id, staff_id, return_date, items, payment, payments } = req.body;

  if (!rental_id || !staff_id) {
    return res.status(400).json({ error: 'rental_id and staff_id are required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      if (!item.rental_item_id) {
        throw new Error('Each item must have a rental_item_id');
      }

      // Fetch equipment_id if not supplied in request
      let eqId = item.equipment_id;
      if (!eqId) {
        const itemRes = await client.query(
          'SELECT equipment_id FROM rental_items WHERE rental_item_id = $1',
          [item.rental_item_id]
        );
        if (itemRes.rows.length === 0) {
          throw new Error(`rental_item_id ${item.rental_item_id} not found`);
        }
        eqId = itemRes.rows[0].equipment_id;
      }

      // 1. INSERT inspection_logs (fires trg_calculate_damage_fee)
      await client.query(
        `INSERT INTO inspection_logs (
           rental_item_id, staff_id, inspection_date,
           condition_note, damage_fee, repair_cost
         )
         VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, COALESCE($5, 0), COALESCE($6, 0))`,
        [
          item.rental_item_id,
          staff_id,
          return_date || null,
          item.condition_note || 'Returned in good condition',
          item.damage_fee || 0,
          item.repair_cost || 0,
        ]
      );

      // 2. Set returned_at on rental_items
      await client.query(
        `UPDATE rental_items
            SET returned_at = COALESCE($1, CURRENT_DATE)
          WHERE rental_item_id = $2`,
        [return_date || null, item.rental_item_id]
      );

      // 3. Set equipment.status = 'Available'
      await client.query(
        `UPDATE equipment
            SET status = 'Available'
          WHERE equipment_id = $1`,
        [eqId]
      );
    }

    // 4. Check if all items in this rental have been returned
    const remainingCheck = await client.query(
      `SELECT COUNT(*) AS remaining
         FROM rental_items
        WHERE rental_id = $1 AND returned_at IS NULL`,
      [rental_id]
    );

    const remainingCount = parseInt(remainingCheck.rows[0].remaining, 10);
    let isCompleted = false;

    if (remainingCount === 0) {
      await client.query(
        `UPDATE rentals
            SET rental_status = 'Completed'
          WHERE rental_id = $1`,
        [rental_id]
      );
      isCompleted = true;
    }

    // 5. INSERT payments ('Settlement' / 'Fine') if provided
    const paymentList = [];
    if (payment && payment.amount > 0) {
      paymentList.push(payment);
    }
    if (Array.isArray(payments)) {
      paymentList.push(...payments.filter((p) => p && p.amount > 0));
    }

    for (const p of paymentList) {
      await client.query(
        `INSERT INTO payments (rental_id, payment_type, amount, payment_method)
         VALUES ($1, $2, $3, $4)`,
        [
          rental_id,
          p.payment_type || 'Settlement',
          p.amount,
          p.payment_method || 'Cash',
        ]
      );
    }

    await client.query('COMMIT');

    // Fetch updated rental summary
    const updatedRental = await client.query(
      `SELECT rental_id, rental_status, total_rental_fee, total_damage_fee, deposit_amount
         FROM rentals
        WHERE rental_id = $1`,
      [rental_id]
    );

    res.json({
      message: 'Return and inspection processed successfully',
      rental_id,
      completed: isCompleted,
      rental: updatedRental.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
