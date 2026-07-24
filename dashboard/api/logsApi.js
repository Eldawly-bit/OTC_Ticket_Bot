const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');

// Get Recent / Categorized / Searched Logs
router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'all'; // 'all', 'user', 'staff'
    const search = req.query.search || '';
    
    let query = `SELECT * FROM logs`;
    let conditions = [];
    let params = [];

    if (type === 'user') {
      conditions.push(`(staff_id IS NULL OR staff_id = '')`);
    } else if (type === 'staff') {
      conditions.push(`(staff_id IS NOT NULL AND staff_id != '')`);
    }

    if (search) {
      conditions.push(`(action LIKE ? OR ticket_name LIKE ? OR staff_tag LIKE ? OR target_user LIKE ? OR details LIKE ?)`);
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY timestamp DESC LIMIT 150`;

    const logs = await dbAsync.all(query, params);
    return res.json(logs);
  } catch (err) {
    console.error('[Logs API Error]', err);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

module.exports = router;
