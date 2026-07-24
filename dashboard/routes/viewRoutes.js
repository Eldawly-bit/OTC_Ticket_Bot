const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { dbAsync } = require('../database/db');

function createViewRouter(client) {
  function getConfig() {
    const configPath = path.join(__dirname, '../../config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Dashboard Home
  router.get(['/', '/home'], async (req, res) => {
    try {
      const config = getConfig();
      const guild = req.guild;

      // Bot Status & Stats
      const ping = Math.round(client.ws.ping);
      const botStatus = client.user ? 'Online' : 'Offline';
      const totalMembers = guild.memberCount;
      const serverName = guild.name;
      const serverIcon = guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

      // DB Counts
      const totalTicketsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets`);
      const openTicketsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE status = 'open'`);
      const closedTicketsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE status = 'closed'`);
      const suggestionsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'suggestion'`);
      const complaintsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'complaint'`);
      const appsRow = await dbAsync.get(`SELECT COUNT(*) as count FROM tickets WHERE type = 'jointeam'`);

      const stats = {
        botStatus,
        ping,
        serverName,
        serverIcon,
        totalMembers,
        totalTickets: totalTicketsRow ? totalTicketsRow.count : 0,
        openTickets: openTicketsRow ? openTicketsRow.count : 0,
        closedTickets: closedTicketsRow ? closedTicketsRow.count : 0,
        totalSuggestions: suggestionsRow ? suggestionsRow.count : 0,
        totalComplaints: complaintsRow ? complaintsRow.count : 0,
        totalApplications: appsRow ? appsRow.count : 0
      };

      res.render('home', {
        pageTitle: 'Dashboard Home',
        activeTab: 'home',
        user: req.session.user,
        stats,
        config,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[View Home Error]', err);
      res.status(500).send('Error rendering dashboard home.');
    }
  });

  // Server Settings Page
  router.get('/server-settings', async (req, res) => {
    try {
      const config = getConfig();
      const guild = req.guild;

      const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
      const textChannels = guild.channels.cache
        .filter(c => c.type === 0)
        .map(c => ({ id: c.id, name: c.name }));
      const categories = guild.channels.cache
        .filter(c => c.type === 4)
        .map(c => ({ id: c.id, name: c.name }));

      res.render('settings', {
        pageTitle: 'Server Settings',
        activeTab: 'server-settings',
        user: req.session.user,
        config,
        roles,
        textChannels,
        categories,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Server Settings View Error]', err);
      res.status(500).send('Error loading server settings.');
    }
  });

  // Ticket Settings Page
  router.get('/ticket-settings', async (req, res) => {
    try {
      const config = getConfig();
      res.render('ticketSettings', {
        pageTitle: 'Ticket Settings',
        activeTab: 'ticket-settings',
        user: req.session.user,
        config,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Ticket Settings View Error]', err);
      res.status(500).send('Error loading ticket settings.');
    }
  });

  // Join Team Settings Page
  router.get('/join-team', async (req, res) => {
    try {
      const config = getConfig();
      const questions = await dbAsync.all(`SELECT * FROM join_team_questions ORDER BY sort_order ASC`);

      res.render('joinTeam', {
        pageTitle: 'Join Team Settings',
        activeTab: 'join-team',
        user: req.session.user,
        config,
        questions,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Join Team View Error]', err);
      res.status(500).send('Error loading join team settings.');
    }
  });

  // Role Settings Page
  router.get('/role-settings', async (req, res) => {
    try {
      const config = getConfig();
      const guild = req.guild;
      const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

      res.render('roleSettings', {
        pageTitle: 'Role Settings',
        activeTab: 'role-settings',
        user: req.session.user,
        config,
        roles,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Role Settings View Error]', err);
      res.status(500).send('Error loading role settings.');
    }
  });

  // Transcripts Page
  router.get('/transcripts', async (req, res) => {
    try {
      const config = getConfig();
      const transcripts = await dbAsync.all(`SELECT id, ticket_name, type, creator_tag, staff_tag, file_name, timestamp FROM transcripts ORDER BY timestamp DESC LIMIT 50`);

      res.render('transcripts', {
        pageTitle: 'Transcripts',
        activeTab: 'transcripts',
        user: req.session.user,
        config,
        transcripts,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Transcripts View Error]', err);
      res.status(500).send('Error loading transcripts page.');
    }
  });

  // Logs Page
  router.get('/logs', async (req, res) => {
    try {
      const config = getConfig();
      const logs = await dbAsync.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100`);

      res.render('logs', {
        pageTitle: 'Activity Logs',
        activeTab: 'logs',
        user: req.session.user,
        config,
        logs,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Logs View Error]', err);
      res.status(500).send('Error loading logs page.');
    }
  });

  // Statistics Page
  router.get('/statistics', async (req, res) => {
    try {
      const config = getConfig();
      res.render('statistics', {
        pageTitle: 'Statistics & Analytics',
        activeTab: 'statistics',
        user: req.session.user,
        config,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Statistics View Error]', err);
      res.status(500).send('Error loading statistics page.');
    }
  });

  // Bot Control Page
  router.get('/control', async (req, res) => {
    try {
      const config = getConfig();
      res.render('control', {
        pageTitle: 'Bot Control Panel',
        activeTab: 'control',
        user: req.session.user,
        config,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('[Control View Error]', err);
      res.status(500).send('Error loading bot control page.');
    }
  });

  return router;
}

module.exports = createViewRouter;
