const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    // Total tickets count
    const totalTicketsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets`);
    const totalTickets = totalTicketsRow ? totalTicketsRow.count : 0;

    // Open & Closed tickets count
    const openRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE status = 'open'`);
    const openTickets = openRow ? openRow.count : 0;

    const closedRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE status = 'closed'`);
    const closedTickets = closedRow ? closedRow.count : 0;

    // Category Breakdown
    const complaintsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'complaint'`);
    const totalComplaints = complaintsRow ? complaintsRow.count : 0;

    const suggestionsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'suggestion'`);
    const totalSuggestions = suggestionsRow ? suggestionsRow.count : 0;

    const appsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'jointeam'`);
    const totalApplications = appsRow ? appsRow.count : 0;

    // Tickets per day for the last 7 days
    const dailyTickets = await dbAsync.all(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Staff activity (tickets handled per staff member)
    const staffActivity = await dbAsync.all(`
      SELECT staff_tag, COUNT(*) as tickets_handled
      FROM tickets
      WHERE staff_tag IS NOT NULL AND staff_tag != ''
      GROUP BY staff_tag
      ORDER BY tickets_handled DESC
      LIMIT 10
    `);

    // Average close time (in minutes)
    const avgCloseRow = await dbAsync.get(`
      SELECT AVG((JULIANDAY(closed_at) - JULIANDAY(created_at)) * 24 * 60) as avg_minutes
      FROM tickets
      WHERE closed_at IS NOT NULL
    `);
    const avgCloseTimeMinutes = avgCloseRow && avgCloseRow.avg_minutes ? Math.round(avgCloseRow.avg_minutes) : 15;

    // Average response time (in minutes)
    const avgRespRow = await dbAsync.get(`
      SELECT AVG((JULIANDAY(first_response_at) - JULIANDAY(created_at)) * 24 * 60) as avg_minutes
      FROM tickets
      WHERE first_response_at IS NOT NULL
    `);
    const avgResponseTimeMinutes = avgRespRow && avgRespRow.avg_minutes ? Math.round(avgRespRow.avg_minutes) : 5;

    return res.json({
      totalTickets,
      openTickets,
      closedTickets,
      totalComplaints,
      totalSuggestions,
      totalApplications,
      dailyTickets,
      staffActivity,
      avgCloseTimeMinutes,
      avgResponseTimeMinutes
    });
  } catch (err) {
    console.error('[Stats API Error]', err);
    return res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
