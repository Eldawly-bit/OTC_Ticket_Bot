const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {

  customId: [
    'delete',
    'confirm_delete',
    'cancel_delete'
  ],


  async execute(interaction, client) {

    const customId = interaction.customId;
    const channel = interaction.channel;


    const configPath = path.join(
      __dirname,
      '../config.json'
    );

    const config = JSON.parse(
      fs.readFileSync(configPath, 'utf8')
    );



    // Cancel Delete
    if (customId === 'cancel_delete') {

      await interaction.message.delete()
        .catch(() => { });

      return;
    }



    // Open Delete Confirmation
    if (customId === 'delete') {

      // ضع هنا رسالة تأكيد الحذف
      // confirm_delete + cancel_delete buttons

      return;
    }



    // Confirm Delete
    if (customId === 'confirm_delete') {


      await interaction.deferReply();



      // حذف رسالة التأكيد

      await interaction.message.delete()
        .catch(() => { });



      const deleteSeconds =
        config.deleteDelaySeconds || 5;



      const deletingEmbed = new EmbedBuilder()

        .setTitle('🗑️ Deleting Ticket')

        .setDescription(
          `This ticket will be deleted in **${deleteSeconds} seconds**.`
        )

        .setColor(
          config.embedColors?.danger || '#ED4245'
        )

        .setTimestamp()

        .setFooter({
          text: 'OTC Ticket Bot'
        });



      await interaction.editReply({
        embeds: [deletingEmbed]
      });



      // Log قبل الحذف

      logger.logAction(
        interaction.guild,
        'Ticket Deleted',
        interaction.user,
        channel.name
      );



      // حذف الروم بعد الوقت المحدد

      setTimeout(async () => {

        try {

          await channel.delete(
            'Ticket deleted via control button.'
          );

        } catch (error) {

          console.error(
            '[DELETE ERROR]',
            error
          );

        }

      }, deleteSeconds * 1000);



    }

  }

};