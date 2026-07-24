const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete the current ticket channel'),

  async execute(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const channel = interaction.channel;
    const name = channel.name;

    // Check if it is a ticket channel (either active or closed)
    const isTicket = name.startsWith('complaint-') || name.startsWith('suggestion-') || name.startsWith('join-') || name.startsWith('closed-');
    if (!isTicket) {
      return interaction.reply({ content: '❌ This command can only be used inside a ticket channel!', ephemeral: true });
    }

    // Only staff or administrators can delete tickets
    const isStaff = interaction.member.roles.cache.has(config.staffRoleId);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

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
};
