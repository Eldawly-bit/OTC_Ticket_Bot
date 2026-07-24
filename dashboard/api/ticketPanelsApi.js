const express = require('express');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { dbAsync } = require('../database/db');

function createTicketPanelsApi(client) {
  const router = express.Router();

  // ─── GET /api/ticket-panels ───
  router.get('/', async (req, res) => {
    try {
      const panels = await dbAsync.all(`SELECT * FROM ticket_panels ORDER BY id DESC`);
      return res.json(panels);
    } catch (err) {
      console.error('[TicketPanels GET Error]', err);
      return res.status(500).json({ error: 'Failed to fetch ticket panels.' });
    }
  });

  // ─── POST /api/ticket-panels ───
  router.post('/', async (req, res) => {
    try {
      const { name, channel_id, title, description, color, image, thumbnail, footer, button_ids } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Panel name is required.' });
      }

      const buttonIdsJson = Array.isArray(button_ids) ? JSON.stringify(button_ids) : (button_ids || '[]');

      const result = await dbAsync.run(`
        INSERT INTO ticket_panels (name, channel_id, title, description, color, image, thumbnail, footer, button_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name.trim(),
        channel_id || '',
        title || '🎫 OTC Ticket Center',
        description || 'Select an option below to open a ticket.',
        color || '#5865F2',
        image || '',
        thumbnail || '',
        footer || 'OTC Ticket Bot',
        buttonIdsJson
      ]);

      const panel = await dbAsync.get(`SELECT * FROM ticket_panels WHERE id = ?`, [result.lastID]);
      return res.status(201).json({ success: true, message: 'Ticket panel created successfully!', panel });
    } catch (err) {
      console.error('[TicketPanels POST Error]', err);
      return res.status(500).json({ error: 'Failed to create ticket panel.' });
    }
  });

  // ─── PUT /api/ticket-panels/:id ───
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, channel_id, title, description, color, image, thumbnail, footer, button_ids } = req.body;

      const existing = await dbAsync.get(`SELECT * FROM ticket_panels WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Panel not found.' });
      }

      const buttonIdsJson = Array.isArray(button_ids) ? JSON.stringify(button_ids) : (button_ids || '[]');

      await dbAsync.run(`
        UPDATE ticket_panels SET
          name = ?, channel_id = ?, title = ?, description = ?, color = ?,
          image = ?, thumbnail = ?, footer = ?, button_ids = ?
        WHERE id = ?
      `, [
        name.trim(),
        channel_id || '',
        title || '🎫 OTC Ticket Center',
        description || 'Select an option below to open a ticket.',
        color || '#5865F2',
        image || '',
        thumbnail || '',
        footer || 'OTC Ticket Bot',
        buttonIdsJson,
        id
      ]);

      const updated = await dbAsync.get(`SELECT * FROM ticket_panels WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Panel updated successfully!', panel: updated });
    } catch (err) {
      console.error('[TicketPanels PUT Error]', err);
      return res.status(500).json({ error: 'Failed to update ticket panel.' });
    }
  });

  // ─── DELETE /api/ticket-panels/:id ───
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbAsync.run(`DELETE FROM ticket_panels WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Panel deleted successfully!' });
    } catch (err) {
      console.error('[TicketPanels DELETE Error]', err);
      return res.status(500).json({ error: 'Failed to delete panel.' });
    }
  });

  // ─── POST /api/ticket-panels/:id/send ───
  router.post('/:id/send', async (req, res) => {
    try {
      const { id } = req.params;
      const { targetChannelId } = req.body;

      const panel = await dbAsync.get(`SELECT * FROM ticket_panels WHERE id = ?`, [id]);
      if (!panel) {
        return res.status(404).json({ error: 'Panel not found.' });
      }

      const channelId = targetChannelId || panel.channel_id;
      if (!channelId) {
        return res.status(400).json({ error: 'Target Discord channel ID is required.' });
      }

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildText) {
        return res.status(400).json({ error: 'Invalid or unreachable text channel.' });
      }

      // Build Embed
      const embed = new EmbedBuilder()
        .setTitle(panel.title || '🎫 OTC Ticket Center')
        .setDescription(panel.description || 'Select an option below to open a ticket.')
        .setColor(panel.color || '#5865F2')
        .setFooter({ text: panel.footer || 'OTC Ticket Bot' });

      if (panel.image) embed.setImage(panel.image);
      if (panel.thumbnail) embed.setThumbnail(panel.thumbnail);

      // Build Buttons
      let selectedKeys = [];
      try {
        selectedKeys = JSON.parse(panel.button_ids || '[]');
      } catch (e) {
        selectedKeys = [];
      }

      let ticketTypes = [];
      if (selectedKeys.length > 0) {
        const placeholders = selectedKeys.map(() => '?').join(',');
        ticketTypes = await dbAsync.all(
          `SELECT * FROM ticket_types WHERE (key IN (${placeholders}) OR id IN (${placeholders})) AND enabled = 1 ORDER BY button_order ASC`,
          [...selectedKeys, ...selectedKeys]
        );
      } else {
        ticketTypes = await dbAsync.all(`SELECT * FROM ticket_types WHERE enabled = 1 ORDER BY button_order ASC`);
      }

      if (ticketTypes.length === 0) {
        return res.status(400).json({ error: 'No active ticket types selected for this panel.' });
      }

      const rows = [];
      let currentRow = new ActionRowBuilder();

      for (const type of ticketTypes) {
        if (currentRow.components.length >= 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        const styleMap = {
          'Primary': ButtonStyle.Primary,
          'Secondary': ButtonStyle.Secondary,
          'Success': ButtonStyle.Success,
          'Danger': ButtonStyle.Danger
        };

        const btn = new ButtonBuilder()
          .setCustomId(`create_${type.key}`)
          .setLabel(type.name)
          .setStyle(styleMap[type.button_style] || ButtonStyle.Primary);

        if (type.emoji) btn.setEmoji(type.emoji);
        currentRow.addComponents(btn);
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      await channel.send({
        embeds: [embed],
        components: rows.slice(0, 5) // max 5 rows
      });

      return res.json({
        success: true,
        message: `Ticket panel successfully sent to channel #${channel.name}!`
      });
    } catch (err) {
      console.error('[TicketPanels SEND Error]', err);
      return res.status(500).json({ error: 'Failed to send panel to Discord channel.' });
    }
  });

  return router;
}

module.exports = createTicketPanelsApi;
