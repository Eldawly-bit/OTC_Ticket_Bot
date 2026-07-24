const express = require('express');
const router = express.Router();
const { dbAsync } = require('../database/db');

// Helper to check for duplicate key, prefix, or name
async function checkDuplicates(name, key, prefix, excludeId = null) {
  const nameRow = await dbAsync.get(
    `SELECT id FROM ticket_types WHERE LOWER(name) = LOWER(?) AND id != ?`,
    [name, excludeId || -1]
  );
  if (nameRow) return 'A ticket type with this name already exists.';

  const keyRow = await dbAsync.get(
    `SELECT id FROM ticket_types WHERE LOWER(key) = LOWER(?) AND id != ?`,
    [key, excludeId || -1]
  );
  if (keyRow) return 'A ticket type with this internal key already exists.';

  const prefixRow = await dbAsync.get(
    `SELECT id FROM ticket_types WHERE LOWER(prefix) = LOWER(?) AND id != ?`,
    [prefix, excludeId || -1]
  );
  if (prefixRow) return 'A ticket type with this channel prefix already exists.';

  return null;
}

// ─── GET /api/ticket-types ───
router.get('/', async (req, res) => {
  try {
    const types = await dbAsync.all(`SELECT * FROM ticket_types ORDER BY button_order ASC, id ASC`);
    return res.json(types);
  } catch (err) {
    console.error('[TicketTypes GET Error]', err);
    return res.status(500).json({ error: 'Failed to fetch ticket types.' });
  }
});

// ─── POST /api/ticket-types ───
router.post('/', async (req, res) => {
  try {
    const {
      name, key, emoji, prefix, description, embed_title, embed_description,
      embed_color, button_style, button_order, category_id, staff_role_id,
      logs_channel_id, enabled, allow_multiple, max_open_tickets,
      auto_close_minutes, auto_delete_minutes
    } = req.body;

    if (!name || !key || !prefix) {
      return res.status(400).json({ error: 'Ticket Name, Internal Key, and Channel Prefix are required fields.' });
    }

    const sanitizedKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const sanitizedPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (!sanitizedKey) {
      return res.status(400).json({ error: 'Internal key must contain valid alphanumeric characters.' });
    }

    // Uniqueness validation
    const duplicateError = await checkDuplicates(name.trim(), sanitizedKey, sanitizedPrefix);
    if (duplicateError) {
      return res.status(400).json({ error: duplicateError });
    }

    const maxOrderRow = await dbAsync.get(`SELECT MAX(button_order) as maxOrder FROM ticket_types`);
    const nextOrder = (maxOrderRow && maxOrderRow.maxOrder ? maxOrderRow.maxOrder : 0) + 1;

    const result = await dbAsync.run(`
      INSERT INTO ticket_types (
        name, key, emoji, prefix, description, embed_title, embed_description,
        embed_color, button_style, button_order, category_id, staff_role_id,
        logs_channel_id, enabled, allow_multiple, max_open_tickets,
        auto_close_minutes, auto_delete_minutes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      name.trim(),
      sanitizedKey,
      emoji || '🎫',
      sanitizedPrefix,
      description || '',
      embed_title || `${emoji || '🎫'} ${name.trim()}`,
      embed_description || 'A staff member will assist you shortly.',
      embed_color || '#5865F2',
      button_style || 'Primary',
      button_order !== undefined ? parseInt(button_order, 10) : nextOrder,
      category_id || '',
      staff_role_id || '',
      logs_channel_id || '',
      enabled ? 1 : 0,
      allow_multiple ? 1 : 0,
      parseInt(max_open_tickets, 10) || 1,
      parseInt(auto_close_minutes, 10) || 0,
      parseInt(auto_delete_minutes, 10) || 0
    ]);

    const createdType = await dbAsync.get(`SELECT * FROM ticket_types WHERE id = ?`, [result.lastID]);

    return res.status(201).json({
      success: true,
      message: `Ticket type "${name}" created successfully!`,
      ticketType: createdType
    });
  } catch (err) {
    console.error('[TicketTypes POST Error]', err);
    return res.status(500).json({ error: 'Failed to create ticket type.' });
  }
});

// ─── PUT /api/ticket-types/:id ───
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbAsync.get(`SELECT * FROM ticket_types WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Ticket type not found.' });
    }

    const {
      name, key, emoji, prefix, description, embed_title, embed_description,
      embed_color, button_style, button_order, category_id, staff_role_id,
      logs_channel_id, enabled, allow_multiple, max_open_tickets,
      auto_close_minutes, auto_delete_minutes
    } = req.body;

    if (!name || !key || !prefix) {
      return res.status(400).json({ error: 'Ticket Name, Internal Key, and Channel Prefix are required fields.' });
    }

    const sanitizedKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const sanitizedPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    const duplicateError = await checkDuplicates(name.trim(), sanitizedKey, sanitizedPrefix, id);
    if (duplicateError) {
      return res.status(400).json({ error: duplicateError });
    }

    await dbAsync.run(`
      UPDATE ticket_types SET
        name = ?, key = ?, emoji = ?, prefix = ?, description = ?, embed_title = ?,
        embed_description = ?, embed_color = ?, button_style = ?, button_order = ?,
        category_id = ?, staff_role_id = ?, logs_channel_id = ?, enabled = ?,
        allow_multiple = ?, max_open_tickets = ?, auto_close_minutes = ?,
        auto_delete_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name.trim(),
      sanitizedKey,
      emoji || '🎫',
      sanitizedPrefix,
      description || '',
      embed_title || `${emoji || '🎫'} ${name.trim()}`,
      embed_description || 'A staff member will assist you shortly.',
      embed_color || '#5865F2',
      button_style || 'Primary',
      button_order !== undefined ? parseInt(button_order, 10) : existing.button_order,
      category_id || '',
      staff_role_id || '',
      logs_channel_id || '',
      enabled ? 1 : 0,
      allow_multiple ? 1 : 0,
      parseInt(max_open_tickets, 10) || 1,
      parseInt(auto_close_minutes, 10) || 0,
      parseInt(auto_delete_minutes, 10) || 0,
      id
    ]);

    const updatedType = await dbAsync.get(`SELECT * FROM ticket_types WHERE id = ?`, [id]);

    return res.json({
      success: true,
      message: `Ticket type "${name}" updated successfully!`,
      ticketType: updatedType
    });
  } catch (err) {
    console.error('[TicketTypes PUT Error]', err);
    return res.status(500).json({ error: 'Failed to update ticket type.' });
  }
});

// ─── DELETE /api/ticket-types/:id ───
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbAsync.get(`SELECT * FROM ticket_types WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Ticket type not found.' });
    }

    await dbAsync.run(`DELETE FROM ticket_types WHERE id = ?`, [id]);

    return res.json({
      success: true,
      message: `Ticket type "${existing.name}" deleted successfully!`
    });
  } catch (err) {
    console.error('[TicketTypes DELETE Error]', err);
    return res.status(500).json({ error: 'Failed to delete ticket type.' });
  }
});

// ─── PATCH /api/ticket-types/:id/toggle ───
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbAsync.get(`SELECT * FROM ticket_types WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Ticket type not found.' });
    }

    const newEnabled = existing.enabled === 1 ? 0 : 1;
    await dbAsync.run(`UPDATE ticket_types SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newEnabled, id]);

    return res.json({
      success: true,
      enabled: newEnabled === 1,
      message: `Ticket type "${existing.name}" is now ${newEnabled === 1 ? 'enabled' : 'disabled'}.`
    });
  } catch (err) {
    console.error('[TicketTypes TOGGLE Error]', err);
    return res.status(500).json({ error: 'Failed to toggle ticket type.' });
  }
});

// ─── POST /api/ticket-types/reorder ───
router.post('/reorder', async (req, res) => {
  try {
    const { order } = req.body; // Array of IDs in new order
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array of ticket type IDs.' });
    }

    for (let i = 0; i < order.length; i++) {
      await dbAsync.run(`UPDATE ticket_types SET button_order = ? WHERE id = ?`, [i + 1, order[i]]);
    }

    return res.json({ success: true, message: 'Ticket types order updated!' });
  } catch (err) {
    console.error('[TicketTypes REORDER Error]', err);
    return res.status(500).json({ error: 'Failed to reorder ticket types.' });
  }
});

module.exports = router;
