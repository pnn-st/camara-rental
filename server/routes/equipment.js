const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/equipment - List equipment with optional filter and search
router.get('/', async (req, res) => {
  try {
    const { status, category_id, search } = req.query;
    let query = `
      SELECT e.equipment_id, e.category_id, c.category_name,
             e.equipment_name, e.serial_number, e.daily_rate, e.status
        FROM equipment e
        JOIN categories c ON c.category_id = e.category_id
       WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (category_id) {
      params.push(category_id);
      query += ` AND e.category_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.equipment_name ILIKE $${params.length} OR e.serial_number ILIKE $${params.length})`;
    }

    query += ' ORDER BY e.equipment_id DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipment/:id - Single equipment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT e.equipment_id, e.category_id, c.category_name,
              e.equipment_name, e.serial_number, e.daily_rate, e.status
         FROM equipment e
         JOIN categories c ON c.category_id = e.category_id
        WHERE e.equipment_id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipment - Create equipment
router.post('/', async (req, res) => {
  try {
    const { category_id, equipment_name, serial_number, daily_rate, status } = req.body;

    if (!category_id || !equipment_name || !serial_number || daily_rate === undefined) {
      return res.status(400).json({ error: 'category_id, equipment_name, serial_number, and daily_rate are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO equipment (category_id, equipment_name, serial_number, daily_rate, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'Available'))
       RETURNING equipment_id, category_id, equipment_name, serial_number, daily_rate, status`,
      [category_id, equipment_name, serial_number, daily_rate, status || 'Available']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/equipment/:id - Update equipment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, equipment_name, serial_number, daily_rate, status } = req.body;

    const { rows } = await db.query(
      `UPDATE equipment
          SET category_id = COALESCE($1, category_id),
              equipment_name = COALESCE($2, equipment_name),
              serial_number = COALESCE($3, serial_number),
              daily_rate = COALESCE($4, daily_rate),
              status = COALESCE($5, status)
        WHERE equipment_id = $6
        RETURNING equipment_id, category_id, equipment_name, serial_number, daily_rate, status`,
      [category_id, equipment_name, serial_number, daily_rate, status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/equipment/:id - Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM equipment WHERE equipment_id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully', equipment_id: parseInt(id, 10) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
