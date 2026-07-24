const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the ticket channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove')
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

    if (!isStaff && !isAdmin) {
      return interaction.reply({ content: '❌ Only staff members and administrators can remove users from this ticket!', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');

    // Remove permissions overwrite for the user
    const overwrite = channel.permissionOverwrites.cache.get(targetUser.id);
    if (!overwrite) {
      return interaction.reply({ content: '❌ This user is not added to this ticket channel!', ephemeral: true });
    }

    await overwrite.delete();

    const embed = new EmbedBuilder()
      .setTitle('➖ User Removed')
      .setDescription(`Successfully removed ${targetUser} from the ticket channel.`)
      .setColor(config.embedColors?.danger || '#ED4245')
      .setTimestamp()
      .setFooter({ text: 'OTC Ticket Bot' });

    await channel.send({ embeds: [embed] });

    const logger = require('../utils/logger');
    logger.logAction(interaction.guild, 'User Removed', interaction.user, targetUser, name);

    return interaction.reply({ content: `Successfully removed ${targetUser.tag} from the ticket.`, ephemeral: true });
  }
};
