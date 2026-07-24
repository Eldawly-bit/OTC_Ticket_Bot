const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
  customId: 'modal_jointeam',

  async execute(interaction, client) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const username = interaction.user.username.toLowerCase();

    const typeInfo = config.ticketTypes.jointeam;
    const ticketChannelName = `${typeInfo.prefix}-${username}`;

    await interaction.deferReply({ ephemeral: true });

    // Check duplicate ticket
    const existingChannel = interaction.guild.channels.cache.find(
      c => c.name === ticketChannelName
    );

    if (existingChannel) {
      return interaction.editReply({
        content: `❌ You already have an open ticket: ${existingChannel}`
      });
    }

    // Get dynamic application answers
    const { dbAsync } = require('../dashboard/database/db');
    const questions = await dbAsync.all(`SELECT * FROM join_team_questions ORDER BY sort_order ASC`);

    const fieldsList = [];
    let logSummary = 'Application:\n';

    if (questions && questions.length > 0) {
      for (const q of questions) {
        try {
          const val = interaction.fields.getTextInputValue(q.question_key);
          if (val) {
            fieldsList.push({ name: `📌 ${q.label}`, value: val });
            logSummary += `${q.label}: ${val.substring(0, 50)}\n`;
          }
        } catch (e) {
          // Field not present in modal submission
        }
      }
    }

    if (fieldsList.length === 0) {
      // Fallback
      const name = interaction.fields.getTextInputValue('join_name') || 'N/A';
      const age = interaction.fields.getTextInputValue('join_age') || 'N/A';
      fieldsList.push({ name: '👤 Name', value: name, inline: true });
      fieldsList.push({ name: '🎂 Age', value: age, inline: true });
      logSummary += `Name: ${name}\nAge: ${age}`;
    }

    // Permissions
    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      }
    ];

    if (config.staffRoleId) {
      permissionOverwrites.push({
        id: config.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    // Category
    let parentId = null;

    if (config.categoryIds?.jointeam) {
      const category = interaction.guild.channels.cache.get(
        config.categoryIds.jointeam
      );

      if (category && category.type === ChannelType.GuildCategory) {
        parentId = category.id;
      }
    }

    try {

      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: ChannelType.GuildText,
        parent: parentId,
        permissionOverwrites,
        topic: `Ticket Owner: ${interaction.user.id} | Type: jointeam`
      });


      const applicationEmbed = new EmbedBuilder()
        .setTitle('🤝 OTC Team Application')
        .setDescription('New team application received:')
        .addFields(fieldsList)
        .setColor(config.embedColors?.success || '#57F287')
        .setTimestamp()
        .setFooter({
          text: config.footerText || 'OTC Ticket Bot'
        });


      const controlEmbed = new EmbedBuilder()
        .setTitle('⚙️ Ticket Controls')
        .setDescription('Manage this ticket using the buttons below.')
        .setColor(config.embedColors?.primary || '#5865F2');


      const buttons = new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId('control_close')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId('control_delete')
            .setLabel('Delete Ticket')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId('control_transcript')
            .setLabel('Save Transcript')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Primary)

        );


      const staffPing = config.staffRoleId
        ? `<@&${config.staffRoleId}>`
        : '';


      await ticketChannel.send({
        content: `Welcome ${interaction.user}! ${staffPing}`,
        embeds: [applicationEmbed]
      });


      await ticketChannel.send({
        embeds: [controlEmbed],
        components: [buttons]
      });


      logger.logAction(
        interaction.guild,
        'Ticket Created',
        null,
        interaction.user,
        ticketChannelName,
        `Application:\nName: ${name}\nAge: ${age}\nGames: ${games}`
      );


      return interaction.editReply({
        content: `✅ Your OTC Team Application has been created: ${ticketChannel}`
      });


    } catch (err) {

      console.error('[Join Team Ticket Error]', err);

      return interaction.editReply({
        content: '❌ Failed to create the application ticket.'
      });

    }
  }
};