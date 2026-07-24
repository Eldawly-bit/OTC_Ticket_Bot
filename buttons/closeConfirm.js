const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');


module.exports = {

  customId: [
    'close',
    'confirm_close',
    'cancel_close'
  ],


  async execute(interaction, client) {

    const channel = interaction.channel;
    const customId = interaction.customId;


    const configPath = path.join(
      __dirname,
      '../config.json'
    );

    const config = JSON.parse(
      fs.readFileSync(configPath,'utf8')
    );


    // إلغاء الإغلاق
    if(customId === 'cancel_close'){

      await interaction.message.delete()
      .catch(()=>{});

      return;
    }



    // فتح تأكيد الإغلاق
    if(customId === 'close'){

      // هنا تضع رسالة التأكيد
      // confirm_close / cancel_close buttons

      return;
    }




    // تأكيد الإغلاق
    if(customId === 'confirm_close'){

      await interaction.deferReply();


      await interaction.message.delete()
      .catch(()=>{});



      const oldName = channel.name;


      const parts = oldName.split('-');

      const username = parts[parts.length - 1];


      const newName = `closed-${username}`;


      await channel.setName(newName)
      .catch(()=>{});



      // قفل التذكرة

      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
          ViewChannel:false,
          SendMessages:false
        }
      );



      // السماح للستاف

      if(config.staffRoleId){

        await channel.permissionOverwrites.edit(
          config.staffRoleId,
          {
            ViewChannel:true,
            SendMessages:true,
            ReadMessageHistory:true,
            ManageMessages:true
          }
        );

      }



      const embed = new EmbedBuilder()

      .setTitle('🔒 Ticket Closed')

      .setDescription(
        `Ticket closed by ${interaction.user}\n\n`+
        `Channel renamed to \`${newName}\``
      )

      .setColor(
        config.embedColors?.danger || '#ED4245'
      )

      .setTimestamp()

      .setFooter({
        text:'OTC Ticket Bot'
      });



      await interaction.editReply({
        embeds:[embed]
      });



      logger.logAction(
        interaction.guild,
        'Ticket Closed',
        interaction.user,
        username,
        newName
      );


    }


  }

};