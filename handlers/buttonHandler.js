const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const buttonsPath = path.join(__dirname, '../buttons');

  if (!fs.existsSync(buttonsPath)) {
    fs.mkdirSync(buttonsPath, { recursive: true });
  }

  const buttonFiles = fs.readdirSync(buttonsPath)
    .filter(file => file.endsWith('.js'));

  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);

    try {
      const button = require(filePath);

      if (!button.customId || !button.execute) {
        console.warn(
          `[WARNING] Button handler ${file} is missing "customId" or "execute"`
        );
        continue;
      }


      // دعم أكثر من Custom ID في ملف واحد
      if (Array.isArray(button.customId)) {

        for (const id of button.customId) {
          client.buttons.set(id, button);
          console.log(`[BUTTON LOADED] ${id}`);
        }

      } else {

        client.buttons.set(button.customId, button);
        console.log(`[BUTTON] Loaded: ${button.customId}`);

      }


    } catch (error) {
      console.error(
        `[ERROR] Failed loading button ${file}:`,
        error
      );
    }
  }
};