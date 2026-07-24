const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Setup the ticket panel in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Check if the bot has required permissions in this channel
    const me = interaction.guild.members.me;
    const channel = interaction.channel;
    if (!channel.permissionsFor(me).has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
      return interaction.reply({
        content: '❌ I do not have permission to send messages or embed links in this channel!',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 OTC Ticket Center')
      .setDescription(
        'Welcome to the OTC Support Center.\n\n' +
        'Please choose one of the options below.\n\n' +
        '😡 **Complaints**\n' +
        '💡 **Suggestions**\n' +
        '🤝 **Request to Join Team**\n\n' +
        'Our staff will respond as soon as possible.'
      )
      .setColor(config.embedColors?.primary || '#5865F2')
      .setFooter({ text: 'OTC Ticket Bot' });

    if (interaction.guild.iconURL()) {
      embed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));
    }

    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_complaint')
        .setLabel('Complaints')
        .setEmoji('😡')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('create_suggestion')
        .setLabel('Suggestions')
        .setEmoji('💡')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('create_jointeam')
        .setLabel('Request to Join Team')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: 'Ticket panel has been setup successfully!',
      ephemeral: true
    });

    await channel.send({
      embeds: [embed],
      components: [buttonsRow]
    });
  }
};
