const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket'),

  async execute(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const channel = interaction.channel;
    const name = channel.name;

    // Check if it is a ticket channel
    const isTicket = name.startsWith('complaint-') || name.startsWith('suggestion-') || name.startsWith('join-');
    if (!isTicket) {
      return interaction.reply({ content: '❌ This command can only be used inside an active ticket channel!', ephemeral: true });
    }

    // Check permissions: Ticket creator (deduced from name or topic), Staff Role, or Admin
    const isStaff = interaction.member.roles.cache.has(config.staffRoleId);
    const isAdmin = interaction.member.permissions.has('Administrator');
    
    // We can check if the user's username is at the end of the channel name
    const parts = name.split('-');
    const creatorUsername = parts[parts.length - 1];
    const isCreator = interaction.user.username.toLowerCase() === creatorUsername.toLowerCase();

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
};
