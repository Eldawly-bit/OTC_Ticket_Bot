const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const modalsPath = path.join(__dirname, '../modals');
  
  if (!fs.existsSync(modalsPath)) {
    fs.mkdirSync(modalsPath);
  }

  const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));

  for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file);
    const modal = require(filePath);
    
    if ('customId' in modal && 'execute' in modal) {
      client.modals.set(modal.customId, modal);
    } else {
      console.warn(`[WARNING] Modal handler at ${filePath} is missing "customId" or "execute" property.`);
    }
  }
};
