const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../dashboard/database/db');

/**
 * Log an action to the configured logs channel & SQLite Database
 * @param {Guild} guild - The Discord guild
 * @param {string} actionName - The action performed (Ticket Created, Ticket Closed, Ticket Deleted, etc.)
 * @param {User} staffUser - The staff member who performed the action (can be null for user actions)
 * @param {User|string} targetUserOrCreator - The ticket creator or user involved
 * @param {string} ticketName - Name of the ticket channel
 * @param {string} [extraDetails] - Optional extra information to display
 */
function logAction(guild, actionName, staffUser, targetUserOrCreator, ticketName, extraDetails = '') {
  try {
    const targetTag = typeof targetUserOrCreator === 'object' ? targetUserOrCreator.tag : (targetUserOrCreator || 'None');
    const targetId = typeof targetUserOrCreator === 'object' ? targetUserOrCreator.id : '';
    const staffTag = staffUser ? staffUser.tag : 'System';
    const staffId = staffUser ? staffUser.id : null;

    // 1. Record in SQLite Database asynchronously
    dbAsync.run(`
      INSERT INTO logs (action, staff_id, staff_tag, target_user, ticket_name, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [actionName, staffId, staffTag, targetTag, ticketName, extraDetails]).catch(err => {
      console.error('[DB Log Error]', err);
    });

    // 2. Track ticket status lifecycle in DB
    let ticketType = 'unknown';
    if (ticketName.includes('complaint')) ticketType = 'complaint';
    else if (ticketName.includes('suggestion')) ticketType = 'suggestion';
    else if (ticketName.includes('join')) ticketType = 'jointeam';

    if (actionName === 'Ticket Created') {
      dbAsync.run(`
        INSERT OR IGNORE INTO tickets (channel_name, type, creator_id, creator_tag, status)
        VALUES (?, ?, ?, ?, 'open')
      `, [ticketName, ticketType, targetId, targetTag]).catch(err => console.error('[DB Ticket Create Error]', err));
    } else if (actionName === 'Ticket Closed') {
      dbAsync.run(`
        UPDATE tickets
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, staff_id = ?, staff_tag = ?
        WHERE channel_name = ? OR channel_name = ?
      `, [staffId, staffTag, ticketName, ticketName.replace('closed-', '')]).catch(err => console.error('[DB Ticket Close Error]', err));
    }

    // 3. Send Discord Channel Embed Log
    const configPath = path.join(__dirname, '../config.json');
    if (!fs.existsSync(configPath)) return;
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const logsChannelId = config.logsChannelId;
    if (!logsChannelId) return;

    const logsChannel = guild.channels.cache.get(logsChannelId);
    if (!logsChannel) return;

    let displayType = 'Unknown';
    if (ticketType === 'complaint') displayType = 'Complaint';
    else if (ticketType === 'suggestion') displayType = 'Suggestion';
    else if (ticketType === 'jointeam') displayType = 'Request to Join Team';

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${actionName}`)
      .setColor(
        actionName.includes('Created') ? (config.embedColors?.success || '#57F287') :
        actionName.includes('Closed') ? (config.embedColors?.warning || '#FEE75C') :
        actionName.includes('Deleted') ? (config.embedColors?.danger || '#ED4245') :
        (config.embedColors?.primary || '#5865F2')
      )
      .addFields(
        { name: 'Ticket Channel', value: `\`${ticketName}\``, inline: true },
        { name: 'Ticket Type', value: displayType, inline: true },
        { name: 'User / Creator', value: typeof targetUserOrCreator === 'object' ? `${targetUserOrCreator} (${targetUserOrCreator.tag})` : targetUserOrCreator || 'None', inline: true },
        { name: 'Staff Member', value: staffUser ? `${staffUser} (${staffUser.tag})` : 'None (System/User)', inline: true },
        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText || 'OTC Ticket Bot' });

    if (extraDetails) {
      embed.addFields({ name: 'Details', value: extraDetails, inline: false });
    }

    logsChannel.send({ embeds: [embed] }).catch(err => {
      console.error('[Logger Send Error]', err);
    });
  } catch (err) {
    console.error('[Logger Helper Error]', err);
  }
}

module.exports = { logAction };
