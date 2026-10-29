const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/insurance - List all insurance plans (for dropdowns)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT insurance_id, plan_name, coverage_limit, fee_rate FROM insurance ORDER BY insurance_id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
