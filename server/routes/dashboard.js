const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard - Query utilization and revenue summary view
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM vw_equipment_utilization_and_revenue_summary ORDER BY category_name ASC'
    );

    // Calculate aggregated overall metrics
    const summary = rows.reduce(
      (acc, row) => {
        acc.total_equipment += parseInt(row.equipment_count || 0, 10);
        acc.total_rented_days += parseInt(row.rented_days || 0, 10);
        acc.total_revenue += parseFloat(row.total_revenue || 0);
        acc.total_repair_cost += parseFloat(row.total_repair_cost || 0);
        return acc;
      },
      {
        total_equipment: 0,
        total_rented_days: 0,
        total_revenue: 0,
        total_repair_cost: 0,
      }
    );

    summary.total_revenue = Math.round(summary.total_revenue * 100) / 100;
    summary.total_repair_cost = Math.round(summary.total_repair_cost * 100) / 100;

    res.json({
      summary,
      categories: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
