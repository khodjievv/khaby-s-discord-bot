const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

// Discord Bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Define Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Sends an announcement embed to a specified channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to send the announcement to').setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('The announcement title').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('The announcement message').setRequired(true)),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Makes the bot say a message')
    .addStringOption(option => option.setName('message').setDescription('The message for the bot to say').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Sends a direct message to a user')
    .addUserOption(option => option.setName('user').setDescription('The user to DM').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('The message to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dmid')
    .setDescription('Sends a direct message to a user by their User ID')
    .addStringOption(option => option.setName('userid').setDescription('The User ID to DM').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('The message to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates a poll with reactions')
    .addStringOption(option => option.setName('question').setDescription('The poll question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Starts a giveaway')
    .addStringOption(option => option.setName('prize').setDescription('The giveaway prize').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 1d)').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);[cite: 3]

  const GUILD_ = '1430150908490027090';
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

// Handle Slash Command Interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'announce') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const message = interaction.options.getString('message');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title)
        .setDescription(message)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `Announcement successfully sent to ${channel}!`, ephemeral: true });
    }

    else if (commandName === 'say') {
      const message = interaction.options.getString('message');
      await interaction.channel.send(message);
      await interaction.reply({ content: 'Message sent!', ephemeral: true });
    }

    else if (commandName === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');

      try {
        await user.send(message);
        await interaction.reply({ content: `Successfully sent a DM to **${user.tag}**.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: `Could not send a DM to **${user.tag}**. Their DMs might be closed.`, ephemeral: true });
      }
    }

    else if (commandName === 'dmid') {
      const userId = interaction.options.getString('userid');
      const message = interaction.options.getString('message');

      try {
        const user = await client.users.fetch(userId);
        await user.send(message);
        await interaction.reply({ content: `Successfully sent a DM to User ID **${userId}**.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: `Could not send a DM to that User ID. Make sure it is valid and their DMs are open.`, ephemeral: true });
      }
    }

    else if (commandName === 'poll') {
      const question = interaction.options.getString('question');

      const embed = new EmbedBuilder()
        .setColor('#fee75c')
        .setTitle('📊 Poll')
        .setDescription(question)
        .setFooter({ text: `Poll created by ${interaction.user.tag}` })
        .setTimestamp();

      const pollMessage = await interaction.reply({ embeds: [embed], fetchReply: true });
      await pollMessage.react('👍');
      await pollMessage.react('👎');
    }

    else if (commandName === 'giveaway') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getString('duration');

      const embed = new EmbedBuilder()
        .setColor('#57f287')
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`Prize: **${prize}**\nDuration: **${duration}**\n\nReact with 🎉 to enter!`)
        .setTimestamp();

      const giveawayMessage = await interaction.reply({ embeds: [embed], fetchReply: true });
      await giveawayMessage.react('🎉');
    }

  } catch (error) {
    console.error('Error handling command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
    }
  }
});

// Login using TOKEN2 or TOKEN fallback
client.login(process.env.TOKEN2 || process.env.TOKEN);
