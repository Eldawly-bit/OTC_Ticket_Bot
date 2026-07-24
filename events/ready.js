const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[INFO] Bot logged in successfully as ${client.user.tag}`);

    // Load and deploy commands
    const configPath = path.join(__dirname, '../config.json');
    if (!fs.existsSync(configPath)) {
      console.error('[ERROR] config.json not found. Make sure it exists in the root directory.');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Set bot presence
    client.user.setPresence({
      activities: [{ name: 'OTC Support Center | /setup-ticket' }],
      status: 'online'
    });

    if (!config.clientId || !config.guildId) {
      console.warn('[WARNING] clientId or guildId is missing in config.json. Commands will not deploy automatically.');
      console.warn('[ACTION REQUIRED] Update config.json with your Client ID and Guild ID, then restart the bot.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
      console.log('[DEPLOY] Started registering application (/) commands...');

      // Load commands using the handler to register in client and get schemas
      const commandHandler = require('../handlers/commandHandler');
      const commands = commandHandler(client);

      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );

      console.log('[DEPLOY] Successfully registered all application (/) commands.');
    } catch (error) {
      console.error('[DEPLOY ERROR] Failed to register slash commands:', error);
    }
  }
};
