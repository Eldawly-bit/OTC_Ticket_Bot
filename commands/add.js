const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the ticket channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add')
        .setRequired(true)
    ),

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
    
    const parts = name.split('-');
    const creatorUsername = parts[parts.length - 1];
    const isCreator = interaction.user.username.toLowerCase() === creatorUsername.toLowerCase();

    if (!isStaff && !isAdmin && !isCreator) {
      return interaction.reply({ content: '❌ You do not have permission to add users to this ticket!', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');

    // Grant ViewChannel permission to target user
    await channel.permissionOverwrites.create(targetUser, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true
    });

    const embed = new EmbedBuilder()
      .setTitle('➕ User Added')
      .setDescription(`Successfully added ${targetUser} to the ticket channel.`)
      .setColor(config.embedColors?.success || '#57F287')
      .setTimestamp()
      .setFooter({ text: 'OTC Ticket Bot' });

    // Send a message to the channel
    await channel.send({ embeds: [embed] });

    // Log the addition (handled by Logger helper)
    const logger = require('../utils/logger');
    logger.logAction(interaction.guild, 'User Added', interaction.user, targetUser, name);

    return interaction.reply({ content: `Successfully added ${targetUser.tag} to the ticket.`, ephemeral: true });
  }
};
