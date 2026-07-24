const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember
  ]
});

// Collections
client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.cooldowns = new Collection();

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('[ERROR] config.json does not exist. Please create it.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (!config.token) {
  console.error('[ERROR] Discord Bot Token is missing in config.json!');
  process.exit(1);
}

// Initialize Handlers
const eventHandler = require('./handlers/eventHandler');
const buttonHandler = require('./handlers/buttonHandler');
const modalHandler = require('./handlers/modalHandler');
const { startDashboard } = require('./dashboard/server');

eventHandler(client);
buttonHandler(client);
modalHandler(client);

client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  // Start Web Dashboard Server
  startDashboard(client);
});

// Login the bot
client.login(config.token).catch(err => {
  console.error('[FATAL] Failed to login to Discord:', err);
  process.exit(1);
});
