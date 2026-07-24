const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the current ticket channel')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The new name for the channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const channel = interaction.channel;
    const oldName = channel.name;

    const isTicket = oldName.startsWith('complaint-') || oldName.startsWith('suggestion-') || oldName.startsWith('join-') || oldName.startsWith('closed-');
    if (!isTicket) {
      return interaction.reply({ content: '❌ This command can only be used inside a ticket channel!', ephemeral: true });
    }

    const isStaff = interaction.member.roles.cache.has(config.staffRoleId);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff && !isAdmin) {
      return interaction.reply({ content: '❌ Only staff members and administrators can rename ticket channels!', ephemeral: true });
    }

    const rawNewName = interaction.options.getString('name');
    // Format rename to lowercase, replace spaces with hyphens to match discord channel format
    const newName = rawNewName.toLowerCase().replace(/\s+/g, '-');

    await channel.setName(newName);

    const embed = new EmbedBuilder()
      .setTitle('🔄 Channel Renamed')
      .setDescription(`This channel has been renamed from \`${oldName}\` to \`${newName}\`.`)
      .setColor(config.embedColors?.primary || '#5865F2')
      .setTimestamp()
      .setFooter({ text: 'OTC Ticket Bot' });

    await channel.send({ embeds: [embed] });

    const logger = require('../utils/logger');
    logger.logAction(interaction.guild, 'Ticket Renamed', interaction.user, null, oldName, `Renamed to ${newName}`);

    return interaction.reply({ content: `Channel renamed to ${newName} successfully.`, ephemeral: true });
  }
};
