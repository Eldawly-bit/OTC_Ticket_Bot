const { PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

/**
 * Ensures user is authenticated via Discord OAuth2
 * and has Administrator or Manage Server permission in the configured Guild.
 */
function checkAuth(client) {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
      }
      return res.redirect('/auth/login');
    }

    try {
      const configPath = path.join(__dirname, '../../config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const guildId = config.guildId;
      if (!guildId) {
        return res.status(500).send('Guild ID is not configured in config.json');
      }

      const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        return res.status(500).send('Bot is not present in the configured Guild.');
      }

      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member) {
        return res.status(403).render('error', { 
          message: 'Access Denied: You are not a member of the configured Discord server.',
          user: req.session.user 
        });
      }

      const isOwner = guild.ownerId === member.id;
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isManageServer = member.permissions.has(PermissionFlagsBits.ManageGuild);

      if (!isOwner && !isAdmin && !isManageServer) {
        return res.status(403).render('error', { 
          message: 'Access Denied: You must have Administrator or Manage Server permissions to access the dashboard.',
          user: req.session.user 
        });
      }

      req.guildMember = member;
      req.guild = guild;
      next();
    } catch (err) {
      console.error('[Auth Middleware Error]', err);
      return res.status(500).send('Internal Server Error during authorization.');
    }
  };
}

module.exports = { checkAuth };
