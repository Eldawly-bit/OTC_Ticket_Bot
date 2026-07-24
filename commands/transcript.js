const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const transcriptUtil = require('../utils/transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Save and log the transcript of the current ticket'),

  async execute(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const channel = interaction.channel;
    const name = channel.name;

    const isTicket = name.startsWith('complaint-') || name.startsWith('suggestion-') || name.startsWith('join-') || name.startsWith('closed-');
    if (!isTicket) {
      return interaction.reply({ content: '❌ This command can only be used inside a ticket channel!', ephemeral: true });
    }

    const isStaff = interaction.member.roles.cache.has(config.staffRoleId);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff && !isAdmin) {
      return interaction.reply({ content: '❌ Only staff members and administrators can generate transcripts!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const logsChannel = interaction.guild.channels.cache.get(config.logsChannelId);
      if (!logsChannel) {
        return interaction.editReply({ content: '❌ Logs channel is not configured or could not be found!' });
      }

      await transcriptUtil.generateAndSend(channel, logsChannel, interaction.user, config);

      return interaction.editReply({ content: `✅ Transcript has been saved and sent to ${logsChannel}.` });
    } catch (err) {
      console.error('[Transcript Command Error]', err);
      return interaction.editReply({ content: '❌ An error occurred while generating the transcript. Please try again.' });
    }
  }
};
