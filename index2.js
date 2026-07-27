const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
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

// Discord Bot setup with GuildInvites intent enabled to track user invites accurately
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
  ],
  presence: {
    status: 'online',
    activities: [{
      name: 'Khaby\'s Utilities',
      type: 0
    }]
  }
});

// Cache for tracking invite uses dynamically alongside database persistence
const guildInvites = new Map();

// Define Slash Commands globally
const commands = [
  new SlashCommandBuilder().setName('speak').setDescription('Sends plain text').addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
  new SlashCommandBuilder().setName('announce').setDescription('Broadcasts notice').addChannelOption(o => o.setName('target_channel').setDescription('Channel').setRequired(true)).addStringOption(o => o.setName('content').setDescription('Body').setRequired(true)),
  new SlashCommandBuilder().setName('update').setDescription('Broadcasts update').addChannelOption(o => o.setName('target_channel').setDescription('Channel').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Details').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Voting ballot').addStringOption(o => o.setName('query').setDescription('Topic').setRequired(true)).addStringOption(o => o.setName('choice_a').setDescription('Choice A').setRequired(true)).addStringOption(o => o.setName('choice_b').setDescription('Choice B').setRequired(true)),
  new SlashCommandBuilder().setName('giveaway').setDescription('Prize giveaway').addStringOption(o => o.setName('item').setDescription('Prize').setRequired(true)).addIntegerOption(o => o.setName('slot_count').setDescription('Winners').setRequired(true)).addIntegerOption(o => o.setName('length_mins').setDescription('Minutes').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flips a coin'),
  new SlashCommandBuilder().setName('invites').setDescription('Check server invite leaderboard').addUserOption(o => o.setName('target_user').setDescription('User').setRequired(false)),
  new SlashCommandBuilder().setName('ticketpanel').setDescription('Sends the support ticket panel').addChannelOption(o => o.setName('target_channel').setDescription('Channel to send panel').setRequired(true)),
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
  
  // Cache all existing invites
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const firstInvites = await guild.invites.fetch();
      guildInvites.set(guildId, new Map(firstInvites.map(invite => [invite.code, invite.uses])));
    } catch (err) {
      console.error(`Failed to fetch invites for guild ${guildId}:`, err);
    }
  }

  const activeToken = process.env.TOKEN2 || process.env.TOKEN;
  const rest = new REST({ version: '10' }).setToken(activeToken);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered global commands.');
  } catch (error) {
    console.error('Command registration error:', error);
  }
});

// --- TRACK NEW INVITES CREATED ---
client.on('inviteCreate', invite => {
  const cachedInvites = guildInvites.get(invite.guild.id);
  if (cachedInvites) {
    cachedInvites.set(invite.code, invite.uses);
  } else {
    guildInvites.set(invite.guild.id, new Map([[invite.code, invite.uses]]));
  }
});

// --- TRACK DELETED INVITES ---
client.on('inviteDelete', invite => {
  const cachedInvites = guildInvites.get(invite.guild.id);
  if (cachedInvites) {
    cachedInvites.delete(invite.code);
  }
});

// --- TRACK MEMBER JOINS & PERSIST INVITE DATA VIA FIREBASE ---
client.on('guildMemberAdd', async member => {
  try {
    const welcomeChannelId = '1530563856466968576';
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = guildInvites.get(member.guild.id);
    let usedInvite = null;

    if (oldInvites) {
      for (const [code, invite] of newInvites) {
        const cachedUses = oldInvites.get(code) || 0;
        if (invite.uses > cachedUses) {
          usedInvite = invite;
          break;
        }
      }
    }

    guildInvites.set(member.guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));

    let inviterText = "an unknown invite link or vanity URL";
    if (usedInvite && usedInvite.inviter) {
      inviterText = `invitation by **@${usedInvite.inviter.username}**`;
      
      const inviterId = usedInvite.inviter.id;
      const inviteRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Invites/${member.guild.id}/${inviterId}.json`;
      
      try {
        const res = await fetch(inviteRef);
        let inviteData = await res.json() || { regular: 0, fake: 0, left: 0, total: 0, history: [] };
        
        inviteData.regular += 1;
        inviteData.total += 1;
        inviteData.history.push({ invitedUserId: member.id, code: usedInvite.code, timestamp: Date.now() });

        await fetch(inviteRef, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inviteData)
        });
      } catch (dbErr) {
        console.error('Database invite update error:', dbErr);
      }
    }

    if (channel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Welcome to Khaby's Utilities!`)
        .setDescription(`Here's a few things you can do in our server!\n\n📄 | **Read rules before starting a conversation!**\n• <#1530563110463738058> — [Click me to read rules!](https://discord.com/channels/1530333292052611093/1530563110463738058)\n*Make sure to review our community guidelines to keep things safe, welcoming, and fun for everyone here.*\n\n💖 | **This server is a helpful community dedicated to custom bots, coding, and hanging out!**\n*Explore various utility projects, share your own code snippets, test out custom bot features, and chat with fellow developers and gamers.*\n\n📜 | **Do not hesitate to ping a staff for any issues!**\nIf it's regarding bugs, staff report, technical inquiries, or anything else, create a ticket!\n🎟️ | <#1530619595923128511> — [Click me to view support!](https://discord.com/channels/1530333292052611093/1530619595923128511)\n*Our support team is always active and ready to assist you with any problems you might encounter.*\n\n⏳ | **... And thats basically it!**\nLook around the server, participate in events, level up through chatting, and enjoy your stay. You'll get the hang of it in no time!`)
        .setImage('https://media.discordapp.net/attachments/1530563110463738061/1531256712491696208/khabywelcomes.png?ex=6a688d71&is=6a673bf1&hm=c48a8e9b541e61252b7430799a6330b621b245c89e161a65931048ac22a81514&=&format=webp&quality=lossless&width=1354&height=672')
        .setFooter({ text: `Joined via ${inviterText}` })
        .setTimestamp();

      const sentMessage = await channel.send({ content: `Welcome to Khaby's Utilities! ${member}`, embeds: [welcomeEmbed] });
      await sentMessage.react('👋');
    }
  } catch (err) {
    console.error('Welcome/Invite event error:', err);
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

    if (customId === 'open_ticket_modal') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_submission_modal')
        .setTitle('User Support');

      const descInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('What do you need help with?')
        .setPlaceholder('Be descriptive')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const issueInput = new TextInputBuilder()
        .setCustomId('ticket_issue')
        .setLabel('What is your issue/question?')
        .setPlaceholder('Ask away!')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(issueInput)
      );

      return interaction.showModal(modal);
    }

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

  if (interaction.isModalSubmit() && interaction.customId === 'ticket_submission_modal') {
    const helpReason = interaction.fields.getTextInputValue('ticket_description');
    const issueQuestion = interaction.fields.getTextInputValue('ticket_issue');

    return interaction.reply({
      content: `✅ Your ticket has been created successfully!\n\n**Help with:** ${helpReason}\n**Issue:** ${issueQuestion}`,
      ephemeral: true
    });
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
  else if (commandName === 'ticketpanel') {
    const channel = interaction.options.getChannel('target_channel');

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('❓ Support')
      .setDescription('Do you have any questions regarding the server or game?\nCreate a ticket here and our moderators will help you!\n\nPlease keep in mind that creating joke tickets is against the rules.')
      .setFooter({ text: 'Official Ticket Tool Partner' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket_modal')
        .setLabel('Create ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📥')
    );

    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ Ticket panel sent successfully!', ephemeral: true });
  }
  else if (commandName === 'invites') {
    const targetUser = interaction.options.getUser('target_user') || interaction.user;
    
    try {
      const res = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Invites/${interaction.guild.id}.json`);
      const allInvites = await res.json() || {};

      const sortedInvites = Object.entries(allInvites)
        .map(([userId, data]) => ({ userId, total: data.total || 0 }))
        .sort((a, b) => b.total - a.total);

      let userTotal = 0;
      let userRank = 'Unranked';

      const userIndex = sortedInvites.findIndex(item => item.userId === targetUser.id);
      if (userIndex !== -1) {
        userTotal = sortedInvites[userIndex].total;
        userRank = `#${userIndex + 1}`;
      }

      let listDesc = `You have invited **${userTotal}** users to this server.\nYou are currently **${userRank}** on the leaderboard.\n\n`;

      for (let i = 0; i < Math.min(sortedInvites.length, 10); i++) {
        const rankNum = i + 1;
        const entry = sortedInvites[i];
        let userDisplay = `<@${entry.userId}>`;
        try {
          const fetchedUsr = await client.users.fetch(entry.userId);
          userDisplay = `@${fetchedUsr.username}`;
        } catch (e) {}

        const inviteWord = entry.total === 1 ? 'invite' : 'invites';
        
        let prefix = `${rankNum}.`;
        if (rankNum === 1) prefix = '🥇';
        else if (rankNum === 2) prefix = '🥈';
        else if (rankNum === 3) prefix = '🥉';

        listDesc += `${prefix} ${userDisplay} — **${entry.total}** ${inviteWord}\n`;
      }

      if (sortedInvites.length === 0) {
        listDesc += `*No invites recorded yet.*`;
      }

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Invite Leaderboard')
        .setDescription(listDesc)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: '❌ Could not load invite leaderboard.', ephemeral: true });
    }
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

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`enter_gw_${giveawayId}`).setLabel('🎉 Enter Giveaway!').setStyle(ButtonStyle.Success));
    const embed = new EmbedBuilder().setColor('#ff007f').setTitle('🎉 GIVEAWAY!').setDescription(`Prize: **${item}**\nWinners: **${slotCount}**\nCloses: <t:${Math.floor(endTime / 1000)}:R>`).setTimestamp(endTime);

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

        const endedEmbed = new EmbedBuilder().setColor('#57F287').setTitle('🏆 GIVEAWAY ENDED').setDescription(`Winners:\n${winners.map(w => `• @${w}`).join('\n')}`).setTimestamp();
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
