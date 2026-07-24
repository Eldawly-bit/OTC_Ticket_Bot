const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const http = require('https');

function getConfig() {
  const configPath = path.join(__dirname, '../../config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// ─── OAuth Login Endpoint ───
router.get('/login', (req, res) => {
  const config = getConfig();
  const clientId = process.env.DISCORD_CLIENT_ID || config.clientId;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/auth/callback`);

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;

  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('login', {
    pageTitle: 'Login',
    activeTab: 'login',
    user: null,
    config,
    discordAuthUrl,
    error: req.query.error || null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// ─── OAuth Callback Endpoint ───
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/auth/login?error=Missing authorization code');
  }

  const config = getConfig();
  const clientId = process.env.DISCORD_CLIENT_ID || config.clientId;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || config.clientSecret || '';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/auth/callback`;

  if (!clientSecret) {
    // Development mode fallback if clientSecret is not yet set in .env or config.json
    console.warn('[OAuth Warning] DISCORD_CLIENT_SECRET is missing in .env or config.json.');
  }

  try {
    // Exchange code for token using fetch / https request
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      scope: 'identify guilds'
    });

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error('[OAuth Token Error]', tokenData);
      return res.redirect('/auth/login?error=' + encodeURIComponent(tokenData.error_description || 'OAuth token exchange failed'));
    }

    // Fetch user info
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();
    if (!userData.id) {
      return res.redirect('/auth/login?error=Failed to fetch Discord user profile');
    }

    // Save user to session
    req.session.user = {
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name || userData.username,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`
    };

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('[OAuth Exception]', err);
    return res.redirect('/auth/login?error=Authentication exception occurred');
  }
});

// ─── Logout Endpoint ───
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
