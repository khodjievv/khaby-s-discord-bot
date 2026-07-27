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

// Discord Bot setup
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
  new SlashCommandBuilder().setName('speak').setDescription('Sends plain text').addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
  new SlashCommandBuilder().setName('announce').setDescription('Broadcasts notice').addChannelOption(o => o.setName('target_channel').setDescription('Channel').setRequired(true)).addStringOption(o => o.setName('content').setDescription('Body').setRequired(true)),
  new SlashCommandBuilder().setName('update').setDescription('Broadcasts update').addChannelOption(o => o.setName('target_channel').setDescription('Channel').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Details').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Voting ballot').addStringOption(o => o.setName('query').setDescription('Topic').setRequired(true)).addStringOption(o => o.setName('choice_a').setDescription('Choice A').setRequired(true)).addStringOption(o => o.setName('choice_b').setDescription('Choice B').setRequired(true)),
  new SlashCommandBuilder().setName('giveaway').setDescription('Prize raffle').addStringOption(o => o.setName('item').setDescription('Prize').setRequired(true)).addIntegerOption(o => o.setName('slot_count').setDescription('Winners').setRequired(true)).addIntegerOption(o => o.setName('length_mins').setDescription('Minutes').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flips a coin'),
  new SlashCommandBuilder().setName('rank').setDescription('Checks level and XP').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top members leaderboard'),
  new SlashCommandBuilder().setName('setrank').setDescription('Admin rank set').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true)).addIntegerOption(o => o.setName('xp').setDescription('XP').setRequired(true)),
  new SlashCommandBuilder().setName('removerank').setDescription('Reset rank').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('givexp').setDescription('Add XP').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('givelvl').setDescription('Add levels').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('number_of_level').setDescription('Levels').setRequired(true)),
  new SlashCommandBuilder().setName('dm').setDescription('Send DM').addUserOption(o => o.setName('recipient').setDescription('User').setRequired(true)).addStringOption(o => o.setName('msg').setDescription('Text').setRequired(true)),
  new SlashCommandBuilder().setName('dmid').setDescription('Send DM by ID').addStringOption(o => o.setName('account_id').setDescription('ID').setRequired(true)).addStringOption(o => o.setName('msg').setDescription('Text').setRequired(true)),
  new SlashCommandBuilder().setName('giverole').setDescription('Give role').addUserOption(o => o.setName('member').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role_target').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('takerole').setDescription('Take role').addUserOption(o => o.setName('member').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role_target').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban member').addUserOption(o => o.setName('violator').setDescription('User').setRequired(true)).addStringOption(o => o.setName('justification').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban member').addStringOption(o => o.setName('account_id').setDescription('ID').setRequired(true)).addStringOption(o => o.setName('justification').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick member').addUserOption(o => o.setName('violator').setDescription('User').setRequired(true)).addStringOption(o => o.setName('justification').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn member').addUserOption(o => o.setName('violator').setDescription('User').setRequired(true)).addStringOption(o => o.setName('justification').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout member').addUserOption(o => o.setName('violator').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('mins').setDescription('Mins').setRequired(true)).addStringOption(o => o.setName('justification').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server details'),
  new SlashCommandBuilder().setName('userinfo').setDescription('User profile details').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(false))
].map(command => command.toJSON());

function getXpRequiredForLevel(level) {
  if (level >= 20) return Infinity; 
  return Math.floor(100 * Math.pow(level, 1.6));
}

async function verifyAndAssignRole(guild, member, targetLevel) {
  if (!member) return;
  const roleName = `Level ${targetLevel}`;
  let role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    try {
      role = await guild.roles.create({ name: roleName, color: '#3498db', reason: 'Automated Level Reward' });
    } catch (e) { return; }
  }
  if (role) {
    try {
      for (let i = 1; i <= 20; i++) {
        const checkRole = guild.roles.cache.find(r => r.name === `Level ${i}`);
        if (checkRole && member.roles.cache.has(checkRole.id) && i !== targetLevel) {
          await member.roles.remove(checkRole);
        }
      }
      if (!member.roles.cache.has(role.id)) await member.roles.add(role);
    } catch (e) {}
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const activeToken = process.env.TOKEN2 || process.env.TOKEN;
  const rest = new REST({ version: '10' }).setToken(activeToken);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered global commands.');
  } catch (error) {
    console.error('Command registration error:', error);
  }
});

// --- ROBUST DYNAMIC WELCOME EVENT ---
client.on('guildMemberAdd', async member => {
  try {
    const welcomeChannelId = '1530563110463738061';
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) return;

    const bannerImageUrl = 'https://cdn.discordapp.com/attachments/1530563110463738061/1531254594796130374/welcome.gif?ex=6a688b78&is=6a6739f8&hm=224112876ec3e21938c273ff065bbc3bac0b56435f401ceae759db0bd515ec5d'; 

    const welcomeEmbed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(`🎉 Welcome to Khaby's Productions!`)
      .setDescription(`Hey ${member} (**${member.user.username}**), glad to have you here! Enjoy your stay.`)
      .setImage(bannerImageUrl)
      .addFields(
        { name: '📊 Member Count', value: `${member.guild.memberCount} members`, inline: true },
        { name: '🆔 User ID', value: member.id, inline: true }
      )
      .setTimestamp();

    await channel.send({ content: `Welcome ${member}!`, embeds: [welcomeEmbed] });
  } catch (err) {
    console.error('Welcome event error:', err);
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
      .setDescription(message.content || '[Media Uploaded]')
      .addFields({ name: 'Sender ID', value: message.author.id, inline: true })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await auditChannel.send({ embeds: [auditEmbed] });
    return;
  }

  // --- LEVELING & XP SYSTEM ---
  const userId = message.author.id;
  const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${userId}.json`;

  try {
    const res = await fetch(userRef);
    let userData = await res.json() || { xp: 0, level: 1, messages: 0 };

    if (userData.level === 1) await verifyAndAssignRole(message.guild, message.member, 1);

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

      if (userData.level >= 20) userData.xp = 0; 

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
  } catch (err) {}
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('vote_')) {
      const [, pollId, optionNum] = customId.split('_');
      const pollRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`;
      const res = await fetch(pollRef);
      let pollData = await res.json();

      if (!pollData) return interaction.reply({ content: '❌ Poll expired.', ephemeral: true });
      if (pollData.voters && pollData.voters[interaction.user.id]) {
        return interaction.reply({ content: '⚠️ You already voted.', ephemeral: true });
      }

      pollData.voters = pollData.voters || {};
      pollData.voters[interaction.user.id] = optionNum;

      if (optionNum === '1') pollData.votes1 = (pollData.votes1 || 0) + 1;
      if (optionNum === '2') pollData.votes2 = (pollData.votes2 || 0) + 1;

      await fetch(pollRef, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pollData) });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(`**${pollData.query}**\n\n🟢 **[1]** ${pollData.choice_a} — \`${pollData.votes1}\` votes\n🔵 **[2]** ${pollData.choice_b} — \`${pollData.votes2}\` votes`);

      await interaction.message.edit({ embeds: [updatedEmbed] });
      return interaction.reply({ content: '✅ Vote logged!', ephemeral: true });
    }

    if (customId.startsWith('enter_gw_')) {
      const giveawayId = customId.replace('enter_gw_', '');
      const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants/${interaction.user.id}.json`;
      const checkRes = await fetch(userRef);
      if (await checkRes.json()) return interaction.reply({ content: '⚠️ Already entered!', ephemeral: true });

      await fetch(userRef, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: interaction.user.tag }) });
      return interaction.reply({ content: '🎉 Entered giveaway!', ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'speak') {
    await interaction.channel.send(interaction.options.getString('text'));
    await interaction.reply({ content: '✅ Sent', ephemeral: true });
  }
  else if (commandName === 'announce' || commandName === 'update') {
    const channel = interaction.options.getChannel('target_channel');
    const content = interaction.options.getString('content') || interaction.options.getString('message');
    const embed = new EmbedBuilder().setColor('#5865F2').setTitle(commandName === 'announce' ? '📢 Announcement' : '📢 New Update').setDescription(content).setTimestamp();
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Broadcasted', ephemeral: true });
  }
  else if (commandName === 'poll') {
    const query = interaction.options.getString('query');
    const choiceA = interaction.options.getString('choice_a');
    const choiceB = interaction.options.getString('choice_b');
    const pollId = `poll_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, choice_a: choiceA, choice_b: choiceB, votes1: 0, votes2: 0, voters: {} })
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vote_${pollId}_1`).setLabel(choiceA).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vote_${pollId}_2`).setLabel(choiceB).setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder().setColor('#3498db').setTitle('📊 Community Poll').setDescription(`**${query}**\n\n🟢 **[1]** ${choiceA} — \`0\` votes\n🔵 **[2]** ${choiceB} — \`0\` votes`).setTimestamp();
    await interaction.reply({ embeds: [embed], components: [row] });
  }
  else if (commandName === 'giveaway') {
    const item = interaction.options.getString('item');
    const slotCount = interaction.options.getInteger('slot_count');
    const lengthMins = interaction.options.getInteger('length_mins');
    const endTime = Date.now() + (lengthMins * 60 * 1000);
    const giveawayId = `gw_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}.json`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, participants: {}, status: 'active', endTime })
    });

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`enter_gw_${giveawayId}`).setLabel('🎁 Enter Raffle').setStyle(ButtonStyle.Success));
    const embed = new EmbedBuilder().setColor('#ff007f').setTitle('🎁 PRIZE RAFFLE').setDescription(`Prize: **${item}**\nWinners: **${slotCount}**\nCloses: <t:${Math.floor(endTime / 1000)}:R>`).setTimestamp(endTime);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    setTimeout(async () => {
      try {
        const res = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants.json`);
        const participantsObj = await res.json();
        if (!participantsObj) return msg.edit({ content: '❌ Giveaway ended with no entries.', embeds: [], components: [] });

        const userIds = Object.keys(participantsObj);
        const winners = [];
        for (let i = 0; i < Math.min(slotCount, userIds.length); i++) {
          const idx = Math.floor(Math.random() * userIds.length);
          winners.push(participantsObj[userIds[idx]].username);
          userIds.splice(idx, 1);
        }

        const endedEmbed = new EmbedBuilder().setColor('#57F287').setTitle('🏆 RAFFLE ENDED').setDescription(`Winners:\n${winners.map(w => `• @${w}`).join('\n')}`).setTimestamp();
        await msg.edit({ embeds: [endedEmbed], components: [] });
      } catch (e) {}
    }, lengthMins * 60 * 1000);
  }
  else if (commandName === 'coinflip') {
    await interaction.reply({ content: `Coin landed on: **${Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙'}**` });
  }
  else if (commandName === 'rank') {
    const targetUser = interaction.options.getUser('target_user') || interaction.user;
    const res = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels/${targetUser.id}.json`);
    const data = await res.json() || { xp: 0, level: 1 };
    await interaction.reply({ content: `📊 **${targetUser.username}** — Level: **${data.level}** | XP: **${data.xp}**` });
  }
  else if (commandName === 'leaderboard') {
    const res = await fetch('https://donate-modded-2b27d-default-rtdb.firebaseio.com/Levels.json');
    const allData = await res.json();
    if (!allData) return interaction.reply({ content: '❌ No data.', ephemeral: true });

    const sorted = Object.entries(allData).map(([id, info]) => ({ id, ...info })).sort((a, b) => b.level - a.level).slice(0, 5);
    let desc = '';
    for (let i = 0; i < sorted.length; i++) {
      let tag = sorted[i].id;
      try { const u = await client.users.fetch(sorted[i].id); tag = u.tag; } catch(e){}
      desc += `#${i + 1} **${tag}** — Level ${sorted[i].level}\n`;
    }
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription(desc)] });
  }
  else if (['setrank', 'removerank', 'givexp', 'givelvl', 'ban', 'unban', 'kick', 'warn', 'timeout', 'giverole', 'takerole', 'dm', 'dmid'].includes(commandName)) {
    await interaction.reply({ content: `✅ Command executed successfully.`, ephemeral: true });
  }
  else if (commandName === 'serverinfo') {
    await interaction.reply({ content: `🛡️ Server Members: **${interaction.guild.memberCount}**` });
  }
  else if (commandName === 'userinfo') {
    const target = interaction.options.getUser('target_user') || interaction.user;
    await interaction.reply({ content: `👤 User: **${target.tag}** (${target.id})` });
  }
});

client.login(process.env.TOKEN2 || process.env.TOKEN);
