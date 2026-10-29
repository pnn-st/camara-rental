const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories - List all categories (for dropdowns / filter)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT category_id, category_name, description FROM categories ORDER BY category_id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
