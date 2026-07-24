const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { dbAsync } = require('../database/db');

const configPath = path.join(__dirname, '../../config.json');

function getConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// ─── Save Server Settings ───
router.post('/server', async (req, res) => {
  try {
    const config = getConfig();
    const { 
      staffRoleId, staffRoles, logsChannelId, welcomeChannelId, 
      primaryColor, dangerColor, successColor, warningColor,
      botName, botAvatar, footerText, timezone, language,
      complaintCategoryId, suggestionCategoryId, jointeamCategoryId
    } = req.body;

    if (staffRoleId !== undefined) config.staffRoleId = staffRoleId;
    if (staffRoles !== undefined) config.staffRoles = Array.isArray(staffRoles) ? staffRoles : [staffRoles].filter(Boolean);
    if (logsChannelId !== undefined) config.logsChannelId = logsChannelId;
    if (welcomeChannelId !== undefined) config.welcomeChannelId = welcomeChannelId;
    
    if (!config.categoryIds) config.categoryIds = {};
    if (complaintCategoryId !== undefined) config.categoryIds.complaint = complaintCategoryId;
    if (suggestionCategoryId !== undefined) config.categoryIds.suggestion = suggestionCategoryId;
    if (jointeamCategoryId !== undefined) config.categoryIds.jointeam = jointeamCategoryId;

    if (!config.embedColors) config.embedColors = {};
    if (primaryColor) config.embedColors.primary = primaryColor;
    if (dangerColor) config.embedColors.danger = dangerColor;
    if (successColor) config.embedColors.success = successColor;
    if (warningColor) config.embedColors.warning = warningColor;

    if (botName !== undefined) config.botName = botName;
    if (botAvatar !== undefined) config.botAvatar = botAvatar;
    if (footerText !== undefined) config.footerText = footerText;
    if (timezone !== undefined) config.timezone = timezone;
    if (language !== undefined) config.language = language;

    saveConfig(config);

    // Save extra keys to DB
    await dbAsync.run(`INSERT OR REPLACE INTO settings_extra (key, value) VALUES (?, ?)`, ['botName', botName || 'OTC Ticket Bot']);
    await dbAsync.run(`INSERT OR REPLACE INTO settings_extra (key, value) VALUES (?, ?)`, ['footerText', footerText || 'OTC Ticket Bot']);
    await dbAsync.run(`INSERT OR REPLACE INTO settings_extra (key, value) VALUES (?, ?)`, ['timezone', timezone || 'UTC']);
    await dbAsync.run(`INSERT OR REPLACE INTO settings_extra (key, value) VALUES (?, ?)`, ['language', language || 'en']);
    await dbAsync.run(`INSERT OR REPLACE INTO settings_extra (key, value) VALUES (?, ?)`, ['welcomeChannelId', welcomeChannelId || '']);

    return res.json({ success: true, message: 'Server settings updated successfully!' });
  } catch (err) {
    console.error('[Settings API Error]', err);
    return res.status(500).json({ error: 'Failed to update server settings.' });
  }
});

// ─── Save Ticket Settings ───
router.post('/ticket', async (req, res) => {
  try {
    const config = getConfig();
    const {
      panelTitle, panelDescription,
      complaintLabel, complaintEmoji, complaintColor, complaintEnabled, complaintPrefix,
      suggestionLabel, suggestionEmoji, suggestionColor, suggestionEnabled, suggestionPrefix,
      jointeamLabel, jointeamEmoji, jointeamColor, jointeamEnabled, jointeamPrefix,
      maxTicketsPerUser, autoClose, autoDelete, transcriptLogsEnabled
    } = req.body;

    if (!config.panel) config.panel = {};
    if (panelTitle !== undefined) config.panel.title = panelTitle;
    if (panelDescription !== undefined) config.panel.description = panelDescription;

    if (!config.ticketTypes) config.ticketTypes = {};
    
    config.ticketTypes.complaint = {
      prefix: complaintPrefix || config.ticketTypes.complaint?.prefix || 'complaint',
      label: complaintLabel || 'Complaints',
      emoji: complaintEmoji || '😡',
      color: complaintColor || 'Danger',
      enabled: complaintEnabled !== false
    };

    config.ticketTypes.suggestion = {
      prefix: suggestionPrefix || config.ticketTypes.suggestion?.prefix || 'suggestion',
      label: suggestionLabel || 'Suggestions',
      emoji: suggestionEmoji || '💡',
      color: suggestionColor || 'Primary',
      enabled: suggestionEnabled !== false
    };

    config.ticketTypes.jointeam = {
      prefix: jointeamPrefix || config.ticketTypes.jointeam?.prefix || 'jointeam',
      label: jointeamLabel || 'Request to Join Team',
      emoji: jointeamEmoji || '🤝',
      color: jointeamColor || 'Success',
      enabled: jointeamEnabled !== false
    };

    config.maxTicketsPerUser = parseInt(maxTicketsPerUser, 10) || 1;
    config.autoClose = autoClose === true || autoClose === 'true';
    config.autoDelete = autoDelete === true || autoDelete === 'true';
    config.transcriptLogsEnabled = transcriptLogsEnabled !== false;

    saveConfig(config);
    return res.json({ success: true, message: 'Ticket settings updated successfully!' });
  } catch (err) {
    console.error('[Ticket Settings API Error]', err);
    return res.status(500).json({ error: 'Failed to update ticket settings.' });
  }
});

// ─── Join Team Questions Settings ───
router.get('/jointeam-questions', async (req, res) => {
  try {
    const questions = await dbAsync.all(`SELECT * FROM join_team_questions ORDER BY sort_order ASC`);
    return res.json(questions);
  } catch (err) {
    console.error('[Join Team Questions GET Error]', err);
    return res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

router.post('/jointeam-questions', async (req, res) => {
  try {
    const { questions } = req.body; // Array of question objects
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array.' });
    }

    if (questions.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 Discord Modal questions are allowed.' });
    }

    // Clear existing questions and insert new list
    await dbAsync.run(`DELETE FROM join_team_questions`);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const key = q.question_key || `join_custom_${i + 1}`;
      await dbAsync.run(`
        INSERT INTO join_team_questions (question_key, label, placeholder, style, required, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        key,
        q.label || `Question ${i + 1}`,
        q.placeholder || '',
        q.style === 'paragraph' ? 'paragraph' : 'short',
        q.required ? 1 : 0,
        i + 1
      ]);
    }

    return res.json({ success: true, message: 'Join team questions updated successfully!' });
  } catch (err) {
    console.error('[Join Team Questions POST Error]', err);
    return res.status(500).json({ error: 'Failed to update join team questions.' });
  }
});

// ─── Role Settings ───
router.post('/roles', async (req, res) => {
  try {
    const config = getConfig();
    const { staffRoles, supportRoles, adminRoles, managerRoles, pingRoles } = req.body;

    if (!config.roles) config.roles = {};

    config.roles.staff = Array.isArray(staffRoles) ? staffRoles : [staffRoles].filter(Boolean);
    config.roles.support = Array.isArray(supportRoles) ? supportRoles : [supportRoles].filter(Boolean);
    config.roles.admin = Array.isArray(adminRoles) ? adminRoles : [adminRoles].filter(Boolean);
    config.roles.manager = Array.isArray(managerRoles) ? managerRoles : [managerRoles].filter(Boolean);
    config.roles.ping = Array.isArray(pingRoles) ? pingRoles : [pingRoles].filter(Boolean);

    // Keep top-level staffRoleId updated with primary staff role for backward compatibility
    if (config.roles.staff.length > 0) {
      config.staffRoleId = config.roles.staff[0];
    }

    saveConfig(config);
    return res.json({ success: true, message: 'Role settings updated successfully!' });
  } catch (err) {
    console.error('[Role Settings API Error]', err);
    return res.status(500).json({ error: 'Failed to update role settings.' });
  }
});

module.exports = router;
