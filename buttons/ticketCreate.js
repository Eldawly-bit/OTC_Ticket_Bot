const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
  customId: 'create_',

  async execute(interaction, client) {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const categoryKey = interaction.customId.replace('create_', ''); // 'complaint', 'suggestion', 'jointeam'
    const typeInfo = config.ticketTypes[categoryKey];

    if (!typeInfo) {
      return interaction.reply({ content: '❌ Invalid ticket category clicked!', ephemeral: true });
    }

    const counterPath = path.join(__dirname, '../ticket-number.json');

    let ticketData = JSON.parse(
      fs.readFileSync(counterPath, 'utf8')
    );

    ticketData.number++;

    fs.writeFileSync(
      counterPath,
      JSON.stringify(ticketData, null, 2)
    );

    const ticketNumber = String(ticketData.number).padStart(3, '0');

    const ticketChannelName = `${typeInfo.prefix}-${ticketNumber}`;

    // ─── Anti-Duplicate Check ───
    const existingChannel = interaction.guild.channels.cache.find(
      c => c.topic?.includes(`Ticket Owner: ${interaction.user.id}`)
    );
    if (existingChannel) {
      return interaction.reply({
        content: `❌ You already have an open ticket of this type: ${existingChannel}`,
        ephemeral: true
      });
    }

    // ─── Use Modal for Join Team Application ───
    if (categoryKey === 'jointeam') {
      const { dbAsync } = require('../dashboard/database/db');
      const questions = await dbAsync.all(`SELECT * FROM join_team_questions ORDER BY sort_order ASC`);

      const modal = new ModalBuilder()
        .setCustomId('modal_jointeam')
        .setTitle('OTC Team Application');

      if (questions && questions.length > 0) {
        questions.slice(0, 5).forEach(q => {
          const input = new TextInputBuilder()
            .setCustomId(q.question_key)
            .setLabel(q.label)
            .setPlaceholder(q.placeholder || '')
            .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(Boolean(q.required));

          modal.addComponents(new ActionRowBuilder().addComponents(input));
        });
      } else {
        // Fallback default questions
        const nameInput = new TextInputBuilder()
          .setCustomId('join_name')
          .setLabel('Name')
          .setPlaceholder('Enter your name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const ageInput = new TextInputBuilder()
          .setCustomId('join_age')
          .setLabel('Age')
          .setPlaceholder('Enter your age')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(ageInput)
        );
      }

      return interaction.showModal(modal);
    }

    // ─── Standard Direct Ticket Creation for Complaint & Suggestion ───
    await interaction.deferReply({ ephemeral: true });

    // ─── Permission Overwrites ───
    const permissionOverwrites = [
      {
        id: interaction.guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id, // Ticket Creator
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

    // Determine parent category
    let parentId = null;
    if (config.categoryIds && config.categoryIds[categoryKey]) {
      const parentChannel = interaction.guild.channels.cache.get(config.categoryIds[categoryKey]);
      if (parentChannel && parentChannel.type === ChannelType.GuildCategory) {
        parentId = parentChannel.id;
      }
    }

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketChannelName,
        type: ChannelType.GuildText,
        parent: parentId,
        permissionOverwrites,
        topic: `Ticket Owner: ${interaction.user.id} | Type: ${categoryKey}`
      });

      const welcomeEmbed = new EmbedBuilder();
      const controlEmbed = new EmbedBuilder();

      if (categoryKey === 'complaint') {
        welcomeEmbed
          .setTitle('😡 Complaint Ticket')
          .setDescription('Please explain your complaint clearly.\n\nA staff member will assist you shortly.')
          .setColor(config.embedColors?.danger || '#ED4245');
      } else if (categoryKey === 'suggestion') {
        welcomeEmbed
          .setTitle('💡 Suggestion Ticket')
          .setDescription('Share your suggestion with as much detail as possible.\n\nWe appreciate every idea.')
          .setColor(config.embedColors?.primary || '#5865F2');
      }

      welcomeEmbed.setTimestamp().setFooter({ text: 'OTC Ticket Bot' });

      controlEmbed
        .setTitle('⚙️ Ticket Controls')
        .setDescription('Use the buttons below to manage this ticket.')
        .setColor(config.embedColors?.primary || '#5865F2');

      const controlRow = new ActionRowBuilder().addComponents(
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

      const staffPing = config.staffRoleId ? `<@&${config.staffRoleId}>` : '';
      await ticketChannel.send({
        content: `Welcome ${interaction.user}! ${staffPing}`,
        embeds: [welcomeEmbed]
      });

      await ticketChannel.send({
        embeds: [controlEmbed],
        components: [controlRow]
      });

      logger.logAction(interaction.guild, 'Ticket Created', null, interaction.user, ticketChannelName);

      return interaction.editReply({
        content: `✅ Your ticket has been created successfully: ${ticketChannel}`
      });
    } catch (err) {
      console.error('[Ticket Channel Creation Error]', err);
      return interaction.editReply({
        content: '❌ Failed to create the ticket channel. Please check the bot permissions.'
      });
    }
  }
};
