const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');

// List / Search Transcripts
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = `SELECT id, ticket_name, type, creator_tag, staff_tag, file_name, timestamp FROM transcripts`;
    let params = [];

    if (search) {
      query += ` WHERE ticket_name LIKE ? OR creator_tag LIKE ? OR staff_tag LIKE ? OR type LIKE ?`;
      const term = `%${search}%`;
      params = [term, term, term, term];
    }

    query += ` ORDER BY timestamp DESC LIMIT 100`;

    const rows = await dbAsync.all(query, params);
    return res.json(rows);
  } catch (err) {
    console.error('[Transcripts API Error]', err);
    return res.status(500).json({ error: 'Failed to fetch transcripts.' });
  }
});

// Download HTML Transcript
router.get('/:id/download/html', async (req, res) => {
  try {
    const row = await dbAsync.get(`SELECT file_name, content_html FROM transcripts WHERE id = ?`, [req.params.id]);
    if (!row || !row.content_html) {
      return res.status(404).send('Transcript not found.');
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${row.file_name || 'transcript.html'}"`);
    return res.send(row.content_html);
  } catch (err) {
    console.error('[Transcript Download Error]', err);
    return res.status(500).send('Error downloading transcript.');
  }
});

// Download TXT Transcript
router.get('/:id/download/txt', async (req, res) => {
  try {
    const row = await dbAsync.get(`SELECT file_name, content_html, content_txt FROM transcripts WHERE id = ?`, [req.params.id]);
    if (!row) {
      return res.status(404).send('Transcript not found.');
    }

    let txtContent = row.content_txt;
    if (!txtContent && row.content_html) {
      // Strip HTML tags to make TXT fallback
      txtContent = row.content_html.replace(/<[^>]+>/g, '');
    }

    const txtFileName = (row.file_name || 'transcript.html').replace(/\.html$/, '.txt');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${txtFileName}"`);
    return res.send(txtContent || 'No transcript content.');
  } catch (err) {
    console.error('[Transcript TXT Download Error]', err);
    return res.status(500).send('Error downloading TXT transcript.');
  }
});

// View HTML Transcript Inline
router.get('/:id/view', async (req, res) => {
  try {
    const row = await dbAsync.get(`SELECT file_name, content_html FROM transcripts WHERE id = ?`, [req.params.id]);
    if (!row || !row.content_html) {
      return res.status(404).send('Transcript content not found.');
    }
    res.setHeader('Content-Type', 'text/html');
    return res.send(row.content_html);
  } catch (err) {
    console.error('[Transcript View Error]', err);
    return res.status(500).send('Error loading transcript.');
  }
});

// Delete Transcript
router.delete('/:id', async (req, res) => {
  try {
    await dbAsync.run(`DELETE FROM transcripts WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Transcript deleted successfully.' });
  } catch (err) {
    console.error('[Transcript Delete Error]', err);
    return res.status(500).json({ error: 'Failed to delete transcript.' });
  }
});

module.exports = router;
