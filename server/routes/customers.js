const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/customers - List customers with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT customer_id, full_name, email, phone, id_card_number FROM customers';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR id_card_number ILIKE $1`;
    }

    query += ' ORDER BY customer_id DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id - Single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT customer_id, full_name, email, phone, id_card_number FROM customers WHERE customer_id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Create customer
router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, id_card_number } = req.body;

    if (!full_name || !email || !phone || !id_card_number) {
      return res.status(400).json({ error: 'full_name, email, phone, and id_card_number are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO customers (full_name, email, phone, id_card_number)
       VALUES ($1, $2, $3, $4)
       RETURNING customer_id, full_name, email, phone, id_card_number`,
      [full_name, email, phone, id_card_number]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, id_card_number } = req.body;

    const { rows } = await db.query(
      `UPDATE customers
          SET full_name = COALESCE($1, full_name),
              email = COALESCE($2, email),
              phone = COALESCE($3, phone),
              id_card_number = COALESCE($4, id_card_number)
        WHERE customer_id = $5
        RETURNING customer_id, full_name, email, phone, id_card_number`,
      [full_name, email, phone, id_card_number, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM customers WHERE customer_id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully', customer_id: parseInt(id, 10) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
