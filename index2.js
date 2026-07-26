const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');

// Express server for Render keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

// Discord Bot setup with necessary base intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Empty commands array (Ready for your new command builders)
const commands = [].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Target Guild ID configured as requested
  const GUILD_ID = '1430150908490027090';
  const activeToken = process.env.TOKEN2 || process.env.TOKEN;
  const rest = new REST({ version: '10' }).setToken(activeToken);
  
  try {
    console.log('Started refreshing guild (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands },
    );
    console.log('Successfully reloaded and updated guild (/) commands.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// Interaction handler skeleton for future commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  // Your new command logic will go here
});

// Secure login using TOKEN2 with TOKEN fallback
client.login(process.env.TOKEN2 || process.env.TOKEN);
