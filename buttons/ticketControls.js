const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const transcriptUtil = require('../utils/transcript');

module.exports = {
  customId: 'control_',

  async execute(interaction, client) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const action = interaction.customId.replace('control_', ''); // 'close', 'delete', 'transcript'
    const channel = interaction.channel;
    const name = channel.name;

    // Check if it's a ticket channel
    const isTicket = name.startsWith('complaint-') || name.startsWith('suggestion-') || name.startsWith('join-') || name.startsWith('closed-');
    if (!isTicket) {
      return interaction.reply({ content: '❌ This action can only be performed in a ticket channel!', ephemeral: true });
    }

    const isStaff = interaction.member.roles.cache.has(config.staffRoleId);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    // Creators can only close their own tickets; staff can do everything
    const parts = name.split('-');
    const creatorUsername = parts[parts.length - 1];
    const isCreator = interaction.user.username.toLowerCase() === creatorUsername.toLowerCase();

    if (action === 'close') {
      if (!isStaff && !isAdmin && !isCreator) {
        return interaction.reply({ content: '❌ You do not have permission to close this ticket!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔒 Close Ticket Confirmation')
        .setDescription('Are you sure you want to close this ticket?')
        .setColor(config.embedColors?.danger || '#ED4245')
        .setFooter({ text: 'OTC Ticket Bot' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close')
          .setLabel('Confirm Close')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (action === 'delete') {
      if (!isStaff && !isAdmin) {
        return interaction.reply({ content: '❌ Only staff members and administrators can delete tickets!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Delete Ticket Confirmation')
        .setDescription('Are you sure you want to delete this ticket? This action is irreversible.')
        .setColor(config.embedColors?.danger || '#ED4245')
        .setFooter({ text: 'OTC Ticket Bot' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_delete')
          .setLabel('Confirm Delete')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_delete')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (action === 'transcript') {
      if (!isStaff && !isAdmin) {
        return interaction.reply({ content: '❌ Only staff members and administrators can save transcripts!', ephemeral: true });
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
        console.error('[Transcript Button Error]', err);
        return interaction.editReply({ content: '❌ An error occurred while generating the transcript.' });
      }
    }
  }
};
