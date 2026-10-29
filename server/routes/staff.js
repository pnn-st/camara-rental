const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/staff - List all staff (for dropdowns)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT staff_id, full_name, role, email FROM staff ORDER BY staff_id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
