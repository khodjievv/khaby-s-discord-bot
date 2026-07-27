const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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

// Discord Bot setup with necessary intents and explicit online presence configuration
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  presence: {
    status: 'online',
    activities: [{
      name: 'Khaby\'s Utilities',
      type: 0
    }]
  }
});

// Define Slash Commands globally
const commands = [
  new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Sends a plain text statement directly through the bot profile')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The text you wish the bot to output')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Broadcasts a formatted notification layout to a specific text channel')
    .addChannelOption(option => option.setName('target_channel').setDescription('Where to publish the notice').setRequired(true))
    .addStringOption(option => option.setName('content').setDescription('The message body for the announcement').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Sets up a dual-option voting ballot for community feedback')
    .addStringOption(option => option.setName('query').setDescription('The topic being voted on').setRequired(true))
    .addStringOption(option => option.setName('choice_a').setDescription('First voting choice').setRequired(true))
    .addStringOption(option => option.setName('choice_b').setDescription('Second voting choice').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Kicks off an automatic prize raffle for server participants')
    .addStringOption(option => option.setName('item').setDescription('Prize description').setRequired(true))
    .addIntegerOption(option => option.setName('slot_count').setDescription('Number of winners available').setRequired(true))
    .addIntegerOption(option => option.setName('length_mins').setDescription('Duration time in minutes').setRequired(true)),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a virtual currency to test your luck'),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Checks your current level, XP progress, and total message count')
    .addUserOption(option => option.setName('target_user').setDescription('Member to check profile for').setRequired(false)),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the top server members ranked by level and XP'),

  new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('Admin command to set a specific user level and XP amount')
    .addUserOption(option => option.setName('target_user').setDescription('Member to modify').setRequired(true))
    .addIntegerOption(option => option.setName('level').setDescription('Target level (1 to 20)').setRequired(true))
    .addIntegerOption(option => option.setName('xp').setDescription('Target XP amount').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removerank')
    .setDescription('Admin command to reset a user back to level 1 and 0 XP')
    .addUserOption(option => option.setName('target_user').setDescription('Member to reset rank for').setRequired(true)),

  new SlashCommandBuilder()
    .setName('givexp')
    .setDescription('Admin command to grant custom XP to a server member')
    .addUserOption(option => option.setName('target_user').setDescription('Member to reward XP to').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Amount of XP to add').setRequired(true)),

  new SlashCommandBuilder()
    .setName('givelvl')
    .setDescription('Admin command to advance a member by a specific number of levels')
    .addUserOption(option => option.setName('target_user').setDescription('Member to promote').setRequired(true))
    .addIntegerOption(option => option.setName('number_of_level').setDescription('How many levels to add').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Dispatches a private message to a member within this server')
    .addUserOption(option => option.setName('recipient').setDescription('The target guild user').setRequired(true))
    .addStringOption(option => option.setName('msg').setDescription('Private text to transmit').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dmid')
    .setDescription('Sends a private message to any user via their unique numeric ID')
    .addStringOption(option => option.setName('account_id').setDescription('Target user ID string').setRequired(true))
    .addStringOption(option => option.setName('msg').setDescription('Private text to transmit').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giverole')
    .setDescription('Assigns a specific security role to a server member')
    .addUserOption(option => option.setName('member').setDescription('User receiving the role').setRequired(true))
    .addRoleOption(option => option.setName('role_target').setDescription('The role to grant').setRequired(true)),

  new SlashCommandBuilder()
    .setName('takerole')
    .setDescription('Strips a specific security role away from a server member')
    .addUserOption(option => option.setName('member').setDescription('User losing the role').setRequired(true))
    .addRoleOption(option => option.setName('role_target').setDescription('The role to remove').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Permanently removes and blocks an offending user from the guild')
    .addUserOption(option => option.setName('violator').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('justification').setDescription('Why they are being banned').setRequired(false)),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Revokes a ban using the target user account identifier')
    .addStringOption(option => option.setName('account_id').setDescription('ID of the banned user').setRequired(true))
    .addStringOption(option => option.setName('justification').setDescription('Reason for the pardon').setRequired(false)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Removes a user from the server while leaving them able to rejoin')
    .addUserOption(option => option.setName('violator').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('justification').setDescription('Why they are being kicked').setRequired(false)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues a formal strike notification to a member via direct message')
    .addUserOption(option => option.setName('violator').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('justification').setDescription('Reason for the warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily restricts a member from speaking or joining voice channels')
    .addUserOption(option => option.setName('violator').setDescription('User to mute').setRequired(true))
    .addIntegerOption(option => option.setName('mins').setDescription('Length in minutes').setRequired(true))
    .addStringOption(option => option.setName('justification').setDescription('Reason for isolation').setRequired(false)),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays high-level operational statistics for this community'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Pulls profile history and details regarding a specific member')
    .addUserOption(option => option.setName('target_user').setDescription('Member to inspect').setRequired(false))
].map(command => command.toJSON());

// XP Calculation Helper: Exponential scaling curve up to Level 20 max limit
function getXpRequiredForLevel(level) {
  if (level >= 20) return Infinity; 
  return Math.floor(100 * Math.pow(level, 1.6));
}

// Helper to verify and handle level role rewards (1 to 20), removing previous lower tier roles
async function verifyAndAssignRole(guild, member, targetLevel) {
  if (!member) return;
  const roleName = `Level ${targetLevel}`;
  let role = guild.roles.cache.find(r => r.name === roleName);

  if (!role) {
    try {
      role = await guild.roles.create({
        name: roleName,
        color: '#3498db',
        reason: 'Automated Level Reward Role'
      });
    } catch (e) {
      console.error('Failed to create level role automatically:', e);
      return;
    }
  }

  if (role) {
    try {
      for (let i = 1; i <= 20; i++) {
        const checkRole = guild.roles.cache.find(r => r.name === `Level ${i}`);
        if (checkRole && member.roles.cache.has(checkRole.id) && i !== targetLevel) {
          await member.roles.remove(checkRole);
        }
      }
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
      }
    } catch (e) {
      console.error('Failed to update level roles for member:', e);
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const activeToken = process.env.TOKEN2 || process.env.TOKEN;
  const rest = new REST({ version: '10' }).setToken(activeToken);
    
  try {
    console.log('Started refreshing global (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('Successfully reloaded and updated global (/) commands.');
  } catch (error) {
    console.error('Failed to register global commands:', error);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.guild) {
    const auditLogChannelId = '1430151280092905666'; 
    const auditChannel = client.channels.cache.get(auditLogChannelId);
    if (!auditChannel) return;

    const auditEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📬 Incoming Direct Message — ${message.author.tag}`)
      .setDescription(message.content || '[Media or Attachment Uploaded]')
      .addFields({ name: 'Sender ID', value: message.author.id, inline: true })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await auditChannel.send({ embeds: [auditEmbed] });
    return;
  }

  // --- LEVELING & XP SYSTEM (Text-Length & Max Level 20 capped) ---
  const userId = message.author.id;
  const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${userId}.json`;

  try {
    const res = await fetch(userRef);
    let userData = await res.json() || { xp: 0, level: 1, messages: 0 };

    if (userData.level === 1) {
      await verifyAndAssignRole(message.guild, message.member, 1);
    }

    if (userData.level < 20) {
      const textLength = message.content.trim().length;
      const earnedXp = Math.min(Math.max(Math.floor(textLength / 6), 1), 40);

      userData.xp += earnedXp;
      userData.messages = (userData.messages || 0) + 1;

      let xpNeeded = getXpRequiredForLevel(userData.level);
      let leveledUp = false;

      while (userData.xp >= xpNeeded && userData.level < 20) {
        userData.xp -= xpNeeded;
        userData.level += 1;
        leveledUp = true;
        xpNeeded = getXpRequiredForLevel(userData.level);
      }

      if (userData.level >= 20) {
        userData.xp = 0; 
      }

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (leveledUp) {
        await verifyAndAssignRole(message.guild, message.member, userData.level);
        const assignedRole = message.guild.roles.cache.find(r => r.name === `Level ${userData.level}`);

        const levelEmbed = new EmbedBuilder()
          .setColor('#00ffcc')
          .setTitle('🎉 Level Up!')
          .setDescription(`Congratulations ${message.author}, you advanced to **Level ${userData.level}**! ${assignedRole ? `\n🎁 Unlocked Role: **${assignedRole.name}**` : ''}`)
          .setTimestamp();

        await message.channel.send({ embeds: [levelEmbed] });
      }
    }
  } catch (err) {
    console.error('Leveling system error:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('vote_')) {
      const [, pollId, optionNum] = customId.split('_');
      const pollRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`;
      
      const res = await fetch(pollRef);
      const pollData = await res.json();

      if (!pollData) {
        return interaction.reply({ content: '❌ This poll instance is no longer valid.', ephemeral: true });
      }

      if (pollData.voters && pollData.voters[interaction.user.id]) {
        return interaction.reply({ content: '⚠️ You have already submitted a vote for this poll.', ephemeral: true });
      }

      const updatedVoters = pollData.voters || {};
      updatedVoters[interaction.user.id] = optionNum;

      let v1 = pollData.votes1 || 0;
      let v2 = pollData.votes2 || 0;
      if (optionNum === '1') v1++;
      if (optionNum === '2') v2++;

      await fetch(pollRef, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes1: v1, votes2: v2, voters: updatedVoters })
      });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(`**${pollData.query}**\n\n🟢 **[1]** ${pollData.choice_a} — \`${v1}\` votes\n🔵 **[2]** ${pollData.choice_b} — \`${v2}\` votes`);

      await interaction.message.edit({ embeds: [updatedEmbed] });
      return interaction.reply({ content: `✅ Vote logged successfully for **${optionNum === '1' ? pollData.choice_a : pollData.choice_b}**!`, ephemeral: true });
    }

    if (customId.startsWith('enter_gw_')) {
      const giveawayId = customId.replace('enter_gw_', '');
      const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants/${interaction.user.id}.json`;
      
      const checkRes = await fetch(userRef);
      const joined = await checkRes.json();

      if (joined) {
        return interaction.reply({ content: '⚠️ You are already entered into this prize draw!', ephemeral: true });
      }

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: interaction.user.tag, timestamp: Date.now() })
      });

      return interaction.reply({ content: '🎉 **Confirmed!** You are officially registered for the giveaway event.', ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'speak') {
    const text = interaction.options.getString('text');
    await interaction.reply({ content: text });
  }

  else if (commandName === 'announce') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ You do not have permission to publish announcements.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('target_channel');
    const content = interaction.options.getString('content');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ Target destination must be a valid text channel.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📢 Server Notice')
      .setDescription(content)
      .setFooter({ text: `Issued by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Announcement successfully broadcasted to ${channel}.`, ephemeral: true });
  }

  else if (commandName === 'poll') {
    const query = interaction.options.getString('query');
    const choiceA = interaction.options.getString('choice_a');
    const choiceB = interaction.options.getString('choice_b');
    const pollId = `poll_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, choice_a: choiceA, choice_b: choiceB, votes1: 0, votes2: 0, voters: {} })
    });

    const btn1 = new ButtonBuilder().setCustomId(`vote_${pollId}_1`).setLabel(choiceA).setStyle(ButtonStyle.Success);
    const btn2 = new ButtonBuilder().setCustomId(`vote_${pollId}_2`).setLabel(choiceB).setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(btn1, btn2);

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📊 Community Ballot')
      .setDescription(`**${query}**\n\n🟢 **[1]** ${choiceA} — \`0\` votes\n🔵 **[2]** ${choiceB} — \`0\` votes`)
      .setFooter({ text: `Ballot ID: ${pollId}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  else if (commandName === 'giveaway') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permissions are required to run giveaways.', ephemeral: true });
    }

    const item = interaction.options.getString('item');
    const slotCount = interaction.options.getInteger('slot_count');
    const lengthMins = interaction.options.getInteger('length_mins');
    const endTime = Date.now() + (lengthMins * 60 * 1000);
    const giveawayId = `gw_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, participants: {}, status: 'active', endTime })
    });

    const joinButton = new ButtonBuilder()
      .setCustomId(`enter_gw_${giveawayId}`)
      .setLabel('🎁 Enter Raffle')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(joinButton);

    const embed = new EmbedBuilder()
      .setColor('#ff007f')
      .setTitle('🎁 EXCLUSIVE PRIZE RAFFLE 🎁')
      .setDescription(`Prize Item: **${item}**\nAvailable Winners: **${slotCount}**\nCloses: <t:${Math.floor(endTime / 1000)}:R>\n\nClick the button below to secure your placement!`)
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp(endTime);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    setTimeout(async () => {
      try {
        const res = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants.json`);
        const participantsObj = await res.json();

        if (!participantsObj) {
          return msg.edit({ content: `❌ Giveaway for **${item}** finished without any participants entering.`, embeds: [], components: [] });
        }

        const userIds = Object.keys(participantsObj);
        const winners = [];

        for (let i = 0; i < Math.min(slotCount, userIds.length); i++) {
          const randomIndex = Math.floor(Math.random() * userIds.length);
          winners.push(participantsObj[userIds[randomIndex]].username);
          userIds.splice(randomIndex, 1);
        }

        const endedEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🏆 RAFFLE DRAW CONCLUDED 🏆')
          .setDescription(`Prize: **${item}**\n\n👑 **Winner(s):**\n${winners.map(w => `• @${w}`).join('\n')}`)
          .setTimestamp();

        await msg.edit({ embeds: [endedEmbed], components: [] });
        await interaction.followUp({ content: `🎊 Big congratulations to ${winners.map(w => `@${w}`).join(', ')} for winning **${item}**!` });
      } catch (err) {
        console.error('Giveaway failure:', err);
      }
    }, lengthMins * 60 * 1000);
  }

  else if (commandName === 'coinflip') {
    const side = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
    const embed = new EmbedBuilder()
      .setColor('#fee75c')
      .setTitle('🎲 Coinflip Outcome')
      .setDescription(`The coin landed on: **${side}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  else if (commandName === 'rank') {
    const targetUser = interaction.options.getUser('target_user') || interaction.user;
    const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`;

    try {
      const res = await fetch(userRef);
      const data = await res.json() || { xp: 0, level: 1, messages: 0 };
      const xpNeeded = getXpRequiredForLevel(data.level);

      const rankEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📊 Level Profile — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏆 Level', value: `${data.level} / 20`, inline: true },
          { name: '✨ Current XP', value: `${data.xp} / ${data.level >= 20 ? 'MAX' : xpNeeded}`, inline: true },
          { name: '💬 Total Messages', value: `${data.messages || 0}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [rankEmbed] });
    } catch (err) {
      await interaction.reply({ content: '❌ Could not retrieve rank details at the moment.', ephemeral: true });
    }
  }

  else if (commandName === 'leaderboard') {
    try {
      const res = await fetch('https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels.json');
      const allData = await res.json();

      if (!allData) {
        return interaction.reply({ content: '❌ No leveling data recorded in the database yet.', ephemeral: true });
      }

      const sortedUsers = Object.entries(allData)
        .map(([id, info]) => ({ id, ...info }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      let description = '';
      for (let i = 0; i < sortedUsers.length; i++) {
        const userEntry = sortedUsers[i];
        let username = `User ID: ${userEntry.id}`;
        try {
          const fetchedUser = await client.users.fetch(userEntry.id);
          username = fetchedUser.tag;
        } catch (e) {}

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i + 1}**`;
        description += `${medal} **${username}** — Level **${userEntry.level}** (${userEntry.xp} XP)\n`;
      }

      const lbEmbed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('🏆 Server Level Leaderboard (Top 10)')
        .setDescription(description)
        .setTimestamp();

      await interaction.reply({ embeds: [lbEmbed] });
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to fetch leaderboard data.', ephemeral: true });
    }
  }

  else if (commandName === 'setrank') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permissions are required to use /setrank.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target_user');
    const newLevel = Math.min(Math.max(interaction.options.getInteger('level'), 1), 20);
    const newXp = interaction.options.getInteger('xp');
    const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`;

    try {
      const res = await fetch(userRef);
      let userData = await res.json() || { messages: 0 };
      userData.level = newLevel;
      userData.xp = newXp;

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (member) {
        await verifyAndAssignRole(interaction.guild, member, newLevel);
      }

      await interaction.reply({ content: `✅ Successfully configured rank for **${targetUser.tag}**: Level **${newLevel}** with **${newXp} XP**.` });
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to update user rank profile.', ephemeral: true });
    }
  }

  else if (commandName === 'removerank') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permissions are required to use /removerank.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target_user');
    const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`;

    try {
      const res = await fetch(userRef);
      let userData = await res.json() || { messages: 0 };
      userData.level = 1;
      userData.xp = 0;

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (member) {
        await verifyAndAssignRole(interaction.guild, member, 1);
      }

      await interaction.reply({ content: `🔄 Successfully reset rank profile for **${targetUser.tag}** back to Level 1 and 0 XP.` });
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to reset user rank data.', ephemeral: true });
    }
  }

  else if (commandName === 'givexp') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permissions are required to use /givexp.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target_user');
    const xpAmount = interaction.options.getInteger('amount');
    const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`;

    try {
      const res = await fetch(userRef);
      let userData = await res.json() || { xp: 0, level: 1, messages: 0 };

      userData.xp += xpAmount;
      let xpNeeded = getXpRequiredForLevel(userData.level);
      let leveledUp = false;

      while (userData.xp >= xpNeeded && userData.level < 20) {
        userData.xp -= xpNeeded;
        userData.level += 1;
        leveledUp = true;
        xpNeeded = getXpRequiredForLevel(userData.level);
      }

      if (userData.level >= 20) {
        userData.xp = 0;
      }

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (leveledUp && member) {
        await verifyAndAssignRole(interaction.guild, member, userData.level);
      }

      await interaction.reply({ content: `✨ Granted **${xpAmount} XP** to **${targetUser.tag}**! (Current Level: ${userData.level}, XP: ${userData.xp})` });
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to grant XP to user.', ephemeral: true });
    }
  }

  else if (commandName === 'givelvl') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permissions are required to use /givelvl.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target_user');
    const levelsToAdd = interaction.options.getInteger('number_of_level');
    const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`;

    try {
      const res = await fetch(userRef);
      let userData = await res.json() || { xp: 0, level: 1, messages: 0 };

      userData.level = Math.min(userData.level + levelsToAdd, 20);
      if (userData.level >= 20) userData.xp = 0;

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (member) {
        await verifyAndAssignRole(interaction.guild, member, userData.level);
      }

      await interaction.reply({ content: `⬆️ Advanced **${targetUser.tag}** up by **${levelsToAdd}** level(s)! They are now at **Level ${userData.level}**.` });
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to promote user level.', ephemeral: true });
    }
  }

  else if (commandName === 'dm') {
    const recipient = interaction.options.getUser('recipient');
    const msg = interaction.options.getString('msg');

    try {
      await recipient.send(msg);
      await interaction.reply({ content: `✅ Private message sent successfully to **${recipient.tag}**!`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: `❌ Unable to deliver message to **${recipient.tag}**. Their DMs might be closed.`, ephemeral: true });
    }
  }

  else if (commandName === 'dmid') {
    const accountId = interaction.options.getString('account_id');
    const msg = interaction.options.getString('msg');

    try {
      const recipient = await client.users.fetch(accountId);
      await recipient.send(msg);
      await interaction.reply({ content: `✅ Direct message delivered to user ID **${accountId}**!`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: `❌ Could not reach that user ID. Verify the ID is correct and DMs are open.`, ephemeral: true });
    }
  }

  else if (commandName === 'giverole') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ You lack permission to manage security roles.', ephemeral: true });
    }

    const member = interaction.options.getMember('member');
    const roleTarget = interaction.options.getRole('role_target');

    try {
      await member.roles.add(roleTarget);
      await interaction.reply({ content: `✅ Successfully granted **${roleTarget.name}** to **${member.user.tag}**.` });
    } catch (error) {
      await interaction.reply({ content: '❌ Failed to assign the specified role. Check bot hierarchy permissions.', ephemeral: true });
    }
  }

  else if (commandName === 'takerole') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ You lack permission to manage security roles.', ephemeral: true });
    }

    const member = interaction.options.getMember('member');
    const roleTarget = interaction.options.getRole('role_target');

    try {
      await member.roles.remove(roleTarget);
      await interaction.reply({ content: `✅ Successfully stripped **${roleTarget.name}** from **${member.user.tag}**.` });
    } catch (error) {
      await interaction.reply({ content: '❌ Failed to remove the specified role. Check bot hierarchy permissions.', ephemeral: true });
    }
  }

  else if (commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to execute bans.', ephemeral: true });
    }

    const violator = interaction.options.getUser('violator');
    const justification = interaction.options.getString('justification') || 'No reason provided';
    const member = await interaction.guild.members.fetch(violator.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Target user could not be located in this server.', ephemeral: true });

    await member.ban({ reason: justification });
    await interaction.reply({ content: `🔨 Successfully banned **${violator.tag}**. Reason: ${justification}` });
  }

  else if (commandName === 'unban') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to execute unbans.', ephemeral: true });
    }

    const accountId = interaction.options.getString('account_id');
    const justification = interaction.options.getString('justification') || 'No reason provided';

    try {
      await interaction.guild.members.unban(accountId, justification);
      await interaction.reply({ content: `✅ Successfully unbanned user ID **${accountId}**. Reason: ${justification}`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: '❌ Could not unban that account. Ensure the ID is accurate and banned.', ephemeral: true });
    }
  }

  else if (commandName === 'kick') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to execute kicks.', ephemeral: true });
    }

    const violator = interaction.options.getUser('violator');
    const justification = interaction.options.getString('justification') || 'No reason provided';
    const member = await interaction.guild.members.fetch(violator.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Target user could not be located in this server.', ephemeral: true });

    await member.kick(justification);
    await interaction.reply({ content: `👢 Successfully kicked **${violator.tag}**. Reason: ${justification}` });
  }

  else if (commandName === 'warn') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to issue warnings.', ephemeral: true });
    }

    const violator = interaction.options.getUser('violator');
    const justification = interaction.options.getString('justification');

    const warningEmbed = new EmbedBuilder()
      .setColor('#ffcc00')
      .setTitle('⚠️ Official Server Warning')
      .setDescription(`You have received a strike in **${interaction.guild.name}**.\n\n**Reason:** ${justification}`)
      .setTimestamp();

    try {
      await violator.send({ embeds: [warningEmbed] });
      await interaction.reply({ content: `✅ Issued a warning to **${violator.tag}** and sent a notification DM.`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: `⚠️ Issued a warning to **${violator.tag}**, but couldn't message them privately (DMs closed).`, ephemeral: true });
    }
  }

  else if (commandName === 'timeout') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You do not have permission to timeout members.', ephemeral: true });
    }

    const violator = interaction.options.getUser('violator');
    const mins = interaction.options.getInteger('mins');
    const justification = interaction.options.getString('justification') || 'No reason provided';
    const member = await interaction.guild.members.fetch(violator.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Target user could not be located in this server.', ephemeral: true });

    const timeoutDuration = mins * 60 * 1000;
    await member.timeout(timeoutDuration, justification);
    await interaction.reply({ content: `⏱️ Successfully muted **${violator.tag}** for ${mins} minutes. Reason: ${justification}` });
  }

  else if (commandName === 'serverinfo') {
    const { guild } = interaction;
    const owner = await guild.fetchOwner();

    const infoEmbed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`🛡️ ${guild.name} Overview`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👑 Guild Owner', value: `${owner.user.tag}`, inline: true },
        { name: '👥 Total Members', value: `${guild.memberCount}`, inline: true },
        { name: '🚀 Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: '📅 Creation Date', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '💬 Total Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: '🔒 Verification Tier', value: `${guild.verificationLevel}`, inline: true }
      )
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [infoEmbed] });
  }

  else if (commandName === 'userinfo') {
    const targetUser = interaction.options.getUser('target_user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const userEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`👤 Account Profile — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🆔 Account ID', value: targetUser.id, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Server Join Date', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [userEmbed] });
  }
});

client.login(process.env.TOKEN2 || process.env.TOKEN);
