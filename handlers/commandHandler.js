const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath);
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARNING] Command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }

  return commands;
};
