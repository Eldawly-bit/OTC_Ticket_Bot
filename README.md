# 🎫 OTC Ticket Bot

A professional, modern, clean, and highly optimized Discord ticket bot for gaming communities. Fully compatible with Discord API v10 and built using **Discord.js v14**.

---

## 🚀 Features

- 🎫 **Three Categories:** Complaints 😡, Suggestions 💡, Request to Join Team 🤝.
- ⚙️ **Modular Control Panel:** Buttons inside every ticket for Closing 🔒, Deleting 🗑️, and saving HTML Transcripts 📄.
- 🤝 **Application Modal Form:** Automatically prompts a clean 5-question form modal for team applications.
- ⏱️ **Cooldown System:** Automatic 5-second cooldown on all commands, buttons, and modals to prevent abuse.
- 🚫 **Anti-Duplicate Check:** Prevents users from opening more than one active ticket of the same type.
- 📋 **Full Log System:** Automatically logs created, closed, deleted, and transcript-saved events to a designated logs channel.
- 📄 **HTML Transcripts:** Generates fully styled HTML transcripts containing all ticket messages, attachments, and embeds.

---

## 📂 Project Structure

```
OTC-Ticket-Bot/
├── commands/            ← Slash Command Handlers
│   ├── setupTicket.js   ← /setup-ticket
│   ├── setupLogs.js     ← /setup-logs
│   ├── close.js         ← /close
│   ├── delete.js        ← /delete
│   ├── add.js           ← /add @user
│   ├── remove.js        ← /remove @user
│   ├── rename.js        ← /rename [name]
│   └── transcript.js    ← /transcript
├── events/              ← Discord Event Listeners
│   ├── ready.js
│   └── interactionCreate.js
├── buttons/             ← Button Click Handlers
│   ├── ticketCreate.js
│   ├── ticketControls.js
│   ├── closeConfirm.js
│   └── deleteConfirm.js
├── modals/              ← Modal Submit Handlers
│   └── joinTeamSubmit.js
├── handlers/            ← System Handlers
│   ├── commandHandler.js
│   ├── eventHandler.js
│   ├── buttonHandler.js
│   └── modalHandler.js
├── utils/               ← Helper Utilities
│   ├── logger.js
│   └── transcript.js
├── config.json          ← Main Configuration Settings
├── index.js             ← Main Bot Entry Point
├── package.json
└── README.md
```

---

## 🛠️ Configuration

Open `config.json` and fill in the fields:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_BOT_CLIENT_ID",
  "guildId": "YOUR_SERVER_GUILD_ID",
  "staffRoleId": "YOUR_STAFF_ROLE_ID",
  "logsChannelId": "YOUR_LOGS_CHANNEL_ID",
  "categoryIds": {
    "complaint": "OPTIONAL_CATEGORY_ID",
    "suggestion": "OPTIONAL_CATEGORY_ID",
    "jointeam": "OPTIONAL_CATEGORY_ID"
  },
  "embedColors": {
    "primary": "#5865F2",
    "danger": "#ED4245",
    "success": "#57F287"
  }
}
```

---

## 💻 Commands

- `/setup-ticket` - Spawns the main ticket panel embed with Complaints, Suggestions, and Request to Join Team buttons. (Admin only)
- `/setup-logs` - Sets the current channel as the logs channel. (Admin only)
- `/close` - Requests confirmation to lock and close the current ticket. (Staff/Creator)
- `/delete` - Requests confirmation to delete the ticket channel in 5 seconds. (Staff only)
- `/add @user` - Adds a user to the ticket channel. (Staff/Creator)
- `/remove @user` - Removes a user from the ticket channel. (Staff only)
- `/rename [name]` - Renames the current ticket channel. (Staff only)
- `/transcript` - Instantly saves and logs the HTML transcript to the logs channel. (Staff only)

---

## ⚙️ Setup & Installation

1. Install all dependencies:
   ```bash
   npm install
   ```

2. Start the bot:
   ```bash
   npm start
   ```

---

*Made with ❤️ for the One Tap Club (OTC) gaming community.*
