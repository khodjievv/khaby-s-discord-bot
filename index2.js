const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

// Discord Bot setup with full necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Helper function to resolve Roblox User ID from ID, Username, or Display Name (Nickname)
async function getRobloxUserId(input) {
  input = input.trim();

  // 1. If it's purely numbers, treat it as a User ID
  if (/^\d+$/.test(input)) {
    const userRes = await fetch(`https://users.roblox.com/v1/users/${input}`);
    const userData = await userRes.json();
    if (userData && !userData.errors) {
      return { userId: input, displayName: userData.displayName || userData.name };
    }
  }

  // 2. Search by keyword (Handles Usernames and Display Names/Nicknames)
  const userRes = await fetch('https://users.roblox.com/v1/users/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: input, limit: 10 })
  });
  const userData = await userRes.json();

  if (userData.data && userData.data.length > 0) {
    const exactMatch = userData.data.find(u => 
      u.name.toLowerCase() === input.toLowerCase() || 
      u.displayName.toLowerCase() === input.toLowerCase()
    ) || userData.data[0];

    return { 
      userId: exactMatch.id.toString(), 
      displayName: exactMatch.displayName || exactMatch.name 
    };
  }

  return null;
}

// Define Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('pong')
    .setDescription('Replies with Ping!'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false)),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user by their User ID')
    .addStringOption(option => option.setName('userid').setDescription('The ID of the user to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for unban').setRequired(false)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false)),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeouts a member')
    .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues a warning to a member')
    .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears a specified number of messages from the channel')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows detailed information about the server'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows detailed information about a specific user')
    .addUserOption(option => option.setName('user').setDescription('The user to inspect').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Posts the ticket support portal panel'),

  new SlashCommandBuilder()
    .setName('gamestats')
    .setDescription('Fetches and displays live stats from your Roblox game'),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Check player donation stats from the game')
    .addStringOption(option => 
      option.setName('player')
        .setDescription('Roblox User ID, Username, or Nickname')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the top 10 player donation leaderboard from the game')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose which stat to rank by')
        .setRequired(true)
        .addChoices(
          { name: 'Donated', value: 'Donated' },
          { name: 'Raised', value: 'Raised' },
          { name: 'Giftbux', value: 'Giftbux' },
          { name: 'Robux', value: 'Robux' }
        )
    ),

  new SlashCommandBuilder()
    .setName('resetstats')
    .setDescription('Resets a player specific stat or all stats in Firebase')
    .addStringOption(option =>
      option.setName('player')
        .setDescription('Roblox User ID, Username, or Nickname to reset')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('stat')
        .setDescription('Which stat to reset')
        .setRequired(true)
        .addChoices(
          { name: 'All Stats', value: 'All' },
          { name: 'Donated', value: 'Donated' },
          { name: 'Raised', value: 'Raised' },
          { name: 'Giftbux', value: 'Giftbux' },
          { name: 'Robux', value: 'Robux' }
        )
    ),

  new SlashCommandBuilder()
    .setName('createcode')
    .setDescription('Creates a game promo code and saves it to Firebase')
    .addStringOption(option => option.setName('code').setDescription('The promo code text (e.g., RELEASE)').setRequired(true))
    .addIntegerOption(option => option.setName('reward').setDescription('The reward amount').setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The currency/stat type for the reward')
        .setRequired(true)
        .addChoices(
          { name: 'Donated', value: 'Donated' },
          { name: 'Raised', value: 'Raised' },
          { name: 'Giftbux', value: 'Giftbux' },
          { name: 'Robux', value: 'Robux' }
        )
    ),

  new SlashCommandBuilder()
    .setName('deletecode')
    .setDescription('Deletes an existing game promo code from Firebase')
    .addStringOption(option => option.setName('code').setDescription('The promo code to delete').setRequired(true)),
    
  new SlashCommandBuilder()
    .setName('givetitle')
    .setDescription('Grants a custom in-game title or badge to a player')
    .addStringOption(option => option.setName('player').setDescription('Roblox User ID, Username, or Nickname').setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('The custom title or badge name (e.g., VIP)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removetitle')
    .setDescription('Removes the custom in-game title or badge from a player')
    .addStringOption(option => option.setName('player').setDescription('Roblox User ID, Username, or Nickname').setRequired(true)),

  new SlashCommandBuilder()
    .setName('syncban')
    .setDescription('Globally bans a user from both Discord and the Roblox game')
    .addUserOption(option => option.setName('target').setDescription('Discord user to ban').setRequired(true))
    .addStringOption(option => option.setName('robloxid').setDescription('Roblox User ID to blacklist').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for global ban').setRequired(false))
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);[cite: 3]

  const GUILD_ID = '1430150908490027090';
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN2 || process.env.TOKEN);
  
  try {
    console.log('Started refreshing guild (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands },
    );
    console.log('Successfully reloaded and updated guild (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Welcomer System
client.on('guildMemberAdd', async member => {
  const welcomeChannelId = '1430173023201398874';
  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) return;

  const rulesChannel = member.guild.channels.cache.find(c => c.name === 'rules' && c.isTextBased());
  const ticketsChannel = member.guild.channels.cache.find(c => c.name === 'tickets' && c.isTextBased());

  const rulesMention = rulesChannel ? `<#${rulesChannel.id}>` : '#rules';
  const ticketsMention = ticketsChannel ? `<#${ticketsChannel.id}>` : '#tickets';

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#ff3333')
    .setDescription(
      `welcome to [$] Puataun ! ${member}\n\n` +
      `Here's a few things you can do in this server!\n\n` +
      `📋 | **Read rules before starting a conversation!**\n` +
      `📄 • ${rulesMention} — Click me to read rules!\n\n` +
      `💌 | **This server is a helpful community dedicated on our games!**\n` +
      `Plz Donate\n\n` +
      `🗓️ | **Do not hesitate to ping a staff for any issues!**\n` +
      `If its regarding bugs, staff report or anything else, Create an ticket!\n` +
      `🎟️ • ${ticketsMention} — Click me to view support!\n\n` +
      `🎗️ | **... And thats basically it!**\n` +
      `Look around the server. You'll get it!`
    )
    .setImage('https://media.discordapp.net/attachments/1463872205950685371/1530934820727689316/photo_2026-07-25_19-17-15.jpg?ex=6a6761a8&is=6a661028&hm=e562563c4c8a7d40a77b66a17cf7a9ed4c20d211810bdb29d3f82c28a4ca5f6c&=&format=webp&width=1218&height=672')
    .setTimestamp();

  await welcomeChannel.send({ embeds: [welcomeEmbed] });
});

// Auto-Moderation & Message Event Handlers
const badWords = ['badword1', 'badword2', 'scamlink.com'];

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 1. Auto-Moderation
  if (message.guild) {
    const contentLower = message.content.toLowerCase();
    const containsForbidden = badWords.some(word => contentLower.includes(word));
    const containsInvite = contentLower.includes('discord.gg/') || contentLower.includes('discord.com/invite/');

    if (containsForbidden || containsInvite) {
      try {
        await message.delete();
        const warningMsg = await message.channel.send(`${message.author}, that type of content is not allowed here!`);
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        return;
      } catch (err) {
        console.error('Auto-mod deletion failed:', err);
      }
    }
  }

  // 2. DM Forwarding to Log Channel
  if (!message.guild) {
    const logChannelId = '1430151280092905666'; 
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const replyEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📩 ${message.author.tag} Replied`)
      .setDescription(message.content || '[Attached an image/embed]')
      .addFields({ name: 'User ID', value: message.author.id, inline: true })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await logChannel.send({ embeds: [replyEmbed] });
  }
});

// Handle Slash Command & Button Interactions
client.on('interactionCreate', async interaction => {
  // Handle Button Component Clicks
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Ticket Close Button Handler
    if (customId === 'close_ticket') {
      await interaction.reply({ content: '🔒 Closing this ticket in 5 seconds...', ephemeral: true });
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (err) {
          console.error('Failed to delete ticket channel:', err);
        }
      }, 5000);
      return;
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'pong') {
      await interaction.reply({ content: 'Ping!', ephemeral: true });
    } 
    
    else if (commandName === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });

      await member.ban({ reason });
      await interaction.reply({ content: `Successfully banned **${user.tag}**. Reason: ${reason}` });
    }

    else if (commandName === 'unban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const userId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      try {
        await interaction.guild.members.unban(userId, reason);
        await interaction.reply({ content: `Successfully unbanned user ID **${userId}**. Reason: ${reason}`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: `Could not unban that user. Make sure the User ID is valid and they are actually banned.`, ephemeral: true });
      }
    } 
    
    else if (commandName === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });

      await member.kick(reason);
      await interaction.reply({ content: `Successfully kicked **${user.tag}**. Reason: ${reason}` });
    } 
    
    else if (commandName === 'timeout') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });

      const durationMs = duration * 60 * 1000;
      await member.timeout(durationMs, reason);
      await interaction.reply({ content: `Successfully timed out **${user.tag}** for ${duration} minutes. Reason: ${reason}` });
    }

    else if (commandName === 'warn') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      const embed = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle('⚠️ You have been warned')
        .setDescription(`You received a warning in **${interaction.guild.name}**.\n\n**Reason:** ${reason}`)
        .setTimestamp();

      try {
        await user.send({ embeds: [embed] });
        await interaction.reply({ content: `Successfully warned **${user.tag}** and sent them a DM notification.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: `Successfully warned **${user.tag}**, but could not send them a DM (their DMs are closed).`, ephemeral: true });
      }
    }

    else if (commandName === 'clear') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Please provide a number between 1 and 100.', ephemeral: true });
      }

      try {
        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `Successfully deleted **${amount}** messages.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Failed to delete messages. Some messages might be older than 14 days.', ephemeral: true });
      }
    } 
    
    else if (commandName === 'serverinfo') {
      const { guild } = interaction;
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`🛡️ ${guild.name} Server Information`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
          { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
          { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
          { name: '📅 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
          { name: '🌍 Verification Level', value: `${guild.verificationLevel}`, inline: true }
        )
        .setFooter({ text: `Server ID: ${guild.id}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'userinfo') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`👤 User Information - ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 User ID', value: user.id, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '📥 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ticketpanel') {
      const embed = new EmbedBuilder()
        .setColor('#7289da')
        .setTitle('Support Portal')
        .setDescription('👋 **How can we help you today?**\n\nSelect the most relevant category from the menu below to open a ticket.\n\n**Note:** You can only have one active ticket at a time.')
        .setImage('https://media.discordapp.net/attachments/1430151280092905666/1530853676615205064/image.png?ex=6a671616&is=6a65c496&hm=cd61181efdeb80664d4de273b480112cd5ce3cd0ad2a44b540c3756c4fcc1693&=&format=webp&quality=lossless&width=1218&height=672');

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_category_select')
          .setPlaceholder('📁 Choose a category...')
          .addOptions([
            { label: 'General Inquiry', value: 'general_inquiry', emoji: '🛡️' },
            { label: 'Player Reporting', value: 'player_reporting', emoji: '⛔' },
            { label: 'Billing & Ranks', value: 'billing_ranks', emoji: '💰' },
            { label: 'Bug Report', value: 'bug_report', emoji: '🐛' },
          ]),
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }

    else if (commandName === 'gamestats') {
      await interaction.deferReply();

      const universeId = '10543353328'; 

      try {
        const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        const data = await response.json();

        if (!data.data || data.data.length === 0) {
          return interaction.editReply({ content: '❌ Could not find game data. Check your Universe ID!' });
        }

        const game = data.data[0];

        const iconRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
        const iconData = await iconRes.json();
        const gameIconUrl = iconData.data?.[0]?.imageUrl || 'https://images.rbxcdn.com/39322bc627582b13fa2592fa44a5359a';

        const votesResponse = await fetch(`https://games.roblox.com/v1/games/${universeId}/votes`);
        const votesData = await votesResponse.json();

        const upVotes = votesData.upVotes || 0;
        const downVotes = votesData.downVotes || 0;
        const totalVotes = upVotes + downVotes;
        const approvalRate = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

        const embed = new EmbedBuilder()
          .setColor('#00b0f4')
          .setTitle(`⚡ [ 🎮 ${game.name.toUpperCase()} LIVE STATS ] ⚡`)
          .setDescription(
            `**GAME TELEMETRY**\n\n` +
            `👥 **Active Players:** \`${game.playing.toLocaleString()}\`\n` +
            `🚀 **Total Visits:** \`${game.visits.toLocaleString()}\`\n\n` +
            `───────────────────────────────────\n\n` +
            `**COMMUNITY RATINGS**\n\n` +
            `⭐ **Favorites:** \`${game.favoritedCount.toLocaleString()}\` Favorites ⭐\n` +
            `👍 **Approval Rating:** \`${approvalRate}%\` (${upVotes.toLocaleString()} Likes)\n\n` +
            `───────────────────────────────────\n\n` +
            `🌐 **STATUS:** \`ONLINE\``
          )
          .setThumbnail(gameIconUrl)
          .setImage(gameIconUrl)
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Failed to fetch Roblox API:', error);
        await interaction.editReply({ content: '❌ Failed to connect to Roblox API.' });
      }
    }

    else if (commandName === 'stats') {
      await interaction.deferReply();
      const input = interaction.options.getString('player');

      try {
        const resolvedUser = await getRobloxUserId(input);
        if (!resolvedUser) {
          return interaction.editReply({ content: `❌ Could not find a Roblox user matching **"${input}"** (try User ID, Username, or Nickname).` });
        }

        const userId = resolvedUser.userId;
        const displayName = resolvedUser.displayName;

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        const thumbData = await thumbRes.json();
        const avatarUrl = thumbData.data?.[0]?.imageUrl || 'https://images.rbxcdn.com/39322bc627582b13fa2592fa44a5359a';

        const firebaseRes = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}.json`);
        const statsData = await firebaseRes.json();

        if (!statsData) {
          return interaction.editReply({ content: `❌ No stats found in the database for **${displayName}** (ID: \`${userId}\`).` });
        }

        const donated = statsData.Donated ?? statsData.donated ?? 0;
        const raised = statsData.Raised ?? statsData.raised ?? 0;
        const giftbux = statsData.Giftbux ?? statsData.giftbux ?? 0;
        const robux = statsData.Robux ?? statsData.robux ?? 0;

        const statsEmbed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setAuthor({ name: 'Puataun Utility', iconURL: 'https://images.rbxcdn.com/39322bc627582b13fa2592fa44a5359a' })
          .setTitle(`✨ ${displayName.toUpperCase()}'S STATS (PDZ)`)
          .setDescription(
            `**Donated** 🌟\n${Number(donated).toLocaleString()}\n\n` +
            `**Raised** 🎀\n${Number(raised).toLocaleString()}\n\n` +
            `**Giftbux**\n${Number(giftbux).toLocaleString()}\n\n` +
            `**Robux** 💎\n${Number(robux).toLocaleString()}`
          )
          .setThumbnail(avatarUrl)
          .setFooter({ text: `User ID: ${userId}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [statsEmbed] });
      } catch (error) {
        console.error('Failed to fetch player stats:', error);
        await interaction.editReply({ content: '❌ Failed to fetch player statistics from Firebase/Roblox.' });
      }
    }

    else if (commandName === 'leaderboard') {
      await interaction.deferReply();
      const category = interaction.options.getString('category');

      try {
        const firebaseRes = await fetch('https://donate-modded-2b27d-default-rtdb.firebaseio.com/.json');
        const playersData = await firebaseRes.json();

        if (!playersData) {
          return interaction.editReply({ content: '❌ No player data found in Firebase yet!' });
        }

        const playerArray = Object.keys(playersData)
          .filter(key => /^\d+$/.test(key))
          .map(userId => {
            const p = playersData[userId] || {};
            return {
              userId: userId,
              Donated: p.Donated ?? p.donated ?? 0,
              Raised: p.Raised ?? p.raised ?? 0,
              Giftbux: p.Giftbux ?? p.giftbux ?? 0,
              Robux: p.Robux ?? p.robux ?? 0
            };
          });

        playerArray.sort((a, b) => {
          const valA = Number(a[category]) || 0;
          const valB = Number(b[category]) || 0;
          return valB - valA;
        });

        const topPlayers = playerArray.slice(0, 10);

        if (topPlayers.length === 0) {
          return interaction.editReply({ content: '❌ Not enough player data to build a leaderboard.' });
        }

        const leaderboardEmbed = new EmbedBuilder()
          .setColor('#ffd700')
          .setTitle(`🏆 TOP 10 ${category.toUpperCase()} LEADERBOARD`)
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp();

        for (let i = 0; i < topPlayers.length; i++) {
          const player = topPlayers[i];
          const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
          
          let username = `User ID: ${player.userId}`;
          let avatarUrl = 'https://images.rbxcdn.com/39322bc627582b13fa2592fa44a5359a';

          try {
            const userRes = await fetch(`https://users.roblox.com/v1/users/${player.userId}`);
            const userData = await userRes.json();
            if (userData && userData.name) {
              username = `**${userData.displayName || userData.name}** (\`@${userData.name}\`)`;
            }

            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${player.userId}&size=150x150&format=Png&isCircular=false`);
            const thumbData = await thumbRes.json();
            if (thumbData.data?.[0]?.imageUrl) {
              avatarUrl = thumbData.data[0].imageUrl;
            }
          } catch (e) {
            // Fallback if API fails
          }

          const statValue = Number(player[category] || 0).toLocaleString();
          
          leaderboardEmbed.addFields({
            name: `${rankEmoji} Rank ${i + 1}`,
            value: `👤 ${username}\n🖼️ [Avatar Link](${avatarUrl})\n📊 **${category}:** \`${statValue}\``,
            inline: false
          });
        }

        await interaction.editReply({ embeds: [leaderboardEmbed] });
      } catch (error) {
        console.error('Failed to generate leaderboard:', error);
        await interaction.editReply({ content: '❌ Failed to fetch leaderboard data from Firebase.' });
      }
    }

    else if (commandName === 'resetstats') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need **Administrator** permissions to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const input = interaction.options.getString('player');
      const statChoice = interaction.options.getString('stat');

      try {
        const resolvedUser = await getRobloxUserId(input);
        if (!resolvedUser) {
          return interaction.editReply({ content: `❌ Could not find a Roblox user matching **"${input}"**.` });
        }

        const userId = resolvedUser.userId;
        const displayName = resolvedUser.displayName;

        const firebaseCheckRes = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}.json`);
        const existingData = await firebaseCheckRes.json();

        if (!existingData) {
          return interaction.editReply({ content: `❌ No record exists in Firebase for **${displayName}** (ID: \`${userId}\`).` });
        }

        if (statChoice === 'All') {
          await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Donated: 0, Raised: 0, Giftbux: 0, Robux: 0 })
          });
        } else {
          const updateObj = {};
          updateObj[statChoice] = 0;
          await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateObj)
          });
        }

        const resetEmbed = new EmbedBuilder()
          .setColor('#ff3333')
          .setTitle('🗑️ Player Stats Reset Successful')
          .setDescription(`Successfully reset **${statChoice}** for **${displayName}** (\`@${userId}\`) in Firebase.`)
          .setTimestamp();

        await interaction.editReply({ embeds: [resetEmbed] });
      } catch (error) {
        console.error('Failed to reset stats in Firebase:', error);
        await interaction.editReply({ content: '❌ Failed to connect to Firebase to reset player stats.' });
      }
    }

    else if (commandName === 'createcode') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need **Administrator** permissions to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const code = interaction.options.getString('code').trim().toUpperCase();
      const reward = interaction.options.getInteger('reward');
      const type = interaction.options.getString('type');

      try {
        await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Codes/${code}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reward: reward, type: type })
        });

        const codeEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🎟️ Promo Code Created')
          .setDescription(`Successfully created promo code **${code}**!\n\n🎁 **Reward:** \`${reward.toLocaleString()} ${type}\``)
          .setTimestamp();

        await interaction.editReply({ embeds: [codeEmbed] });
      } catch (error) {
        console.error('Failed to create code in Firebase:', error);
        await interaction.editReply({ content: '❌ Failed to save promo code to Firebase.' });
      }
    }

    else if (commandName === 'deletecode') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need **Administrator** permissions to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const code = interaction.options.getString('code').trim().toUpperCase();

      try {
        await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Codes/${code}.json`, {
          method: 'DELETE'
        });

        const codeEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🗑️ Promo Code Deleted')
          .setDescription(`Successfully deleted promo code **${code}** from Firebase.`)
          .setTimestamp();

        await interaction.editReply({ embeds: [codeEmbed] });
      } catch (error) {
        console.error('Failed to delete code from Firebase:', error);
        await interaction.editReply({ content: '❌ Failed to delete promo code from Firebase.' });
      }
    }

    else if (commandName === 'givetitle') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need **Administrator** permissions to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const input = interaction.options.getString('player');
      const customTitle = interaction.options.getString('title');

      try {
        const resolvedUser = await getRobloxUserId(input);
        if (!resolvedUser) {
          return interaction.editReply({ content: `❌ Could not find a Roblox user matching **"${input}"**.` });
        }

        const userId = resolvedUser.userId;
        const displayName = resolvedUser.displayName;

        await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ SpecialTitle: customTitle })
        });

        const titleEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('✨ In-Game Title Granted')
          .setDescription(`Successfully granted the title **"${customTitle}"** to **${displayName}** (\`@${userId}\`).`)
          .setTimestamp();

        await interaction.editReply({ embeds: [titleEmbed] });
      } catch (error) {
        console.error('Failed to grant title in Firebase:', error);
        await interaction.editReply({ content: '❌ Failed to save custom title to Firebase.' });
      }
    }

    else if (commandName === 'removetitle') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need **Administrator** permissions to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const input = interaction.options.getString('player');

      try {
        const resolvedUser = await getRobloxUserId(input);
        if (!resolvedUser) {
          return interaction.editReply({ content: `❌ Could not find a Roblox user matching **"${input}"**.` });
        }

        const userId = resolvedUser.userId;
        const displayName = resolvedUser.displayName;

        await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/${userId}/SpecialTitle.json`, {
          method: 'DELETE'
        });

        const titleEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🗑️ In-Game Title Removed')
          .setDescription(`Successfully removed the custom title from **${displayName}** (\`@${userId}\`).`)
          .setTimestamp();

        await interaction.editReply({ embeds: [titleEmbed] });
      } catch (error) {
        console.error('Failed to remove title from Firebase:', error);
        await interaction.editReply({ content: '❌ Failed to remove custom title from Firebase.' });
      }
    }

    else if (commandName === 'syncban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
      }

      await interaction.deferReply();
      const discordUser = interaction.options.getUser('target');
      const robloxId = interaction.options.getString('robloxid');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      try {
        await interaction.guild.members.ban(discordUser.id, { reason: reason });
      } catch (e) {
        console.log('Failed to ban from Discord server: ' + e);
      }

      await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/BannedPlayers/${robloxId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannedBy: interaction.user.tag,
          reason: reason,
          timestamp: Date.now(),
          discordId: discordUser.id
        })
      });

      const banEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🚨 GLOBAL SECURITY BAN EXECUTED')
        .setDescription(`The hammer has dropped. User has been eradicated across all platforms.`)
        .addFields(
          { name: 'Discord User', value: `${discordUser.tag} (${discordUser.id})`, inline: true },
          { name: 'Roblox ID', value: `${robloxId}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [banEmbed] });
    }
  } catch (error) {
    console.error('Error handling command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(() => {});
    }
  }
});

// Handle Ticket Dropdown
client.on('interactionCreate', async interaction => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    await interaction.deferReply({ ephemeral: true });

    const categoryValue = interaction.values[0];
    const guild = interaction.guild;
    const member = interaction.member;

    const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase()}`);
    if (existingChannel) {
      return interaction.editReply({ content: `❌ You already have an active ticket open here: ${existingChannel}` });
    }

    try {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
      });

      await interaction.editReply({ content: `✅ Your ticket has been created! Head over to ${ticketChannel}` });

      const welcomeEmbed = new EmbedBuilder()
        .setColor('#7289da')
        .setTitle(`Ticket: ${categoryValue.replace('_', ' ').toUpperCase()}`)
        .setDescription(`Hello ${member}, thank you for reaching out.\n\nPlease describe your issue in detail, and a staff member will be with you shortly.`);

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ embeds: [welcomeEmbed], components: [closeButton] });
    } catch (error) {
      console.error('Failed to create ticket channel:', error);
      await interaction.editReply({ content: '❌ Failed to create your ticket channel.' });
    }
  }
});

client.login(process.env.TOKEN2 || process.env.TOKEN);
