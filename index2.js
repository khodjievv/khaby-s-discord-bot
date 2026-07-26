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

// Discord Bot setup with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ]
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const activeToken = process.env.TOKEN2 || process.env.TOKEN;
  const rest = new REST({ version: '10' }).setToken(activeToken);
  
  // Registers commands globally across all servers the bot is in
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
    const auditLogChannelId = '1530620291913613374'; 
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

// Secure login using TOKEN2 with TOKEN fallback
client.login(process.env.TOKEN2 || process.env.TOKEN);
