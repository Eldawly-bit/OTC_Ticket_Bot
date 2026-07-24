const express = require('express');
const router = express.Router();
const path = require('path');

function createControlRouter(client) {
  // Reload Commands
  router.post('/reload-commands', async (req, res) => {
    try {
      const commandHandler = require('../../handlers/commandHandler');
      client.commands.clear();
      commandHandler(client);
      return res.json({ success: true, message: 'Commands reloaded successfully!' });
    } catch (err) {
      console.error('[Reload Commands Error]', err);
      return res.status(500).json({ error: 'Failed to reload commands: ' + err.message });
    }
  });

  // Reload Buttons
  router.post('/reload-buttons', async (req, res) => {
    try {
      const buttonHandler = require('../../handlers/buttonHandler');
      client.buttons.clear();
      buttonHandler(client);
      return res.json({ success: true, message: 'Buttons reloaded successfully!' });
    } catch (err) {
      console.error('[Reload Buttons Error]', err);
      return res.status(500).json({ error: 'Failed to reload buttons: ' + err.message });
    }
  });

  // Reload Events
  router.post('/reload-events', async (req, res) => {
    try {
      client.removeAllListeners();
      const eventHandler = require('../../handlers/eventHandler');
      eventHandler(client);
      return res.json({ success: true, message: 'Events reloaded successfully!' });
    } catch (err) {
      console.error('[Reload Events Error]', err);
      return res.status(500).json({ error: 'Failed to reload events: ' + err.message });
    }
  });

  // Reload Config
  router.post('/reload-config', async (req, res) => {
    try {
      const configPath = path.join(__dirname, '../../config.json');
      delete require.cache[require.resolve(configPath)];
      const updatedConfig = require(configPath);
      return res.json({ success: true, message: 'Configuration reloaded successfully!', config: updatedConfig });
    } catch (err) {
      console.error('[Reload Config Error]', err);
      return res.status(500).json({ error: 'Failed to reload config: ' + err.message });
    }
  });

  // Restart Bot
  router.post('/restart-bot', async (req, res) => {
    try {
      res.json({ success: true, message: 'Bot process is restarting...' });
      setTimeout(() => {
        console.log('[System] Bot restart triggered from dashboard.');
        process.exit(0); // If running under PM2/nodemon/process manager, it will auto-restart
      }, 1000);
    } catch (err) {
      console.error('[Restart Bot Error]', err);
      return res.status(500).json({ error: 'Failed to trigger bot restart.' });
    }
  });

  return router;
}

module.exports = createControlRouter;
