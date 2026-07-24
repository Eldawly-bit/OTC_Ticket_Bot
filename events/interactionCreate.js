const { InteractionType } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // ─── Cooldown Check (5 seconds) ───
    const cooldownTime = 5000; // 5 seconds
    const now = Date.now();
    
    // Create identifier for the interaction
    let interactionId = '';
    if (interaction.isChatInputCommand()) {
      interactionId = interaction.commandName;
    } else if (interaction.isButton()) {
      interactionId = interaction.customId;
    } else if (interaction.isModalSubmit()) {
      interactionId = interaction.customId;
    }

    if (interactionId) {
      const cooldownKey = `${interaction.user.id}-${interactionId}`;
      if (client.cooldowns.has(cooldownKey)) {
        const expirationTime = client.cooldowns.get(cooldownKey) + cooldownTime;
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before performing this action.`,
            ephemeral: true
          });
        }
      }
      // Record interaction timestamp for cooldown
      client.cooldowns.set(cooldownKey, now);
      setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownTime);
    }

    // ─── Command Handling ───
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[Command Execution Error] ${interaction.commandName}:`, error);
        const replyObj = { content: '❌ There was an error executing this command!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyObj);
        } else {
          await interaction.reply(replyObj);
        }
      }
    }

    // ─── Button Handling ───
    if (interaction.isButton()) {
      // Find button by custom ID exact or dynamic
      let button = client.buttons.get(interaction.customId);
      
      // If not exact matching, search for prefix (e.g. for confirm_close, confirm_delete, etc.)
      if (!button) {
        for (const [key, btn] of client.buttons) {
          if (interaction.customId.startsWith(key)) {
            button = btn;
            break;
          }
        }
      }

      if (button) {
        try {
          await button.execute(interaction, client);
        } catch (error) {
          console.error(`[Button Execution Error] ${interaction.customId}:`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ There was an error processing this action!', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ There was an error processing this action!', ephemeral: true });
          }
        }
      }
    }

    // ─── Modal Handling ───
    if (interaction.isModalSubmit()) {
      let modal = client.modals.get(interaction.customId);

      if (!modal) {
        for (const [key, mdl] of client.modals) {
          if (interaction.customId.startsWith(key)) {
            modal = mdl;
            break;
          }
        }
      }

      if (modal) {
        try {
          await modal.execute(interaction, client);
        } catch (error) {
          console.error(`[Modal Execution Error] ${interaction.customId}:`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ There was an error processing your submission!', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ There was an error processing your submission!', ephemeral: true });
          }
        }
      }
    }
  }
};
