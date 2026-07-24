const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('Configure the channel for logs')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send ticket logs to (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const configPath = path.join(__dirname, '../config.json');
    
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      return interaction.reply({ content: '❌ Failed to read configuration file.', ephemeral: true });
    }

    config.logsChannelId = targetChannel.id;

    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (err) {
      return interaction.reply({ content: '❌ Failed to save configuration file.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Logs Configured')
      .setDescription(`Successfully set the ticket logs channel to ${targetChannel}. All ticket logs and transcripts will be sent there.`)
      .setColor(config.embedColors?.success || '#57F287')
      .setTimestamp()
      .setFooter({ text: 'OTC Ticket Bot' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
