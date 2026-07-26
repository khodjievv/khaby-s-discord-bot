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

// Discord Bot setup with necessary base intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Define Slash Commands with unique descriptions
const commands = [
  new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Echoes your text directly through the bot account')
    .addStringOption(option => 
      option.setName('content')
        .setDescription('The text you want the bot to broadcast')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Publishes a structured notification embed to a chosen channel')
    .addChannelOption(option => option.setName('destination').setDescription('Target text channel').setRequired(true))
    .addStringOption(option => option.setName('announcement').setDescription('Body text of the notice').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Launches an interactive voting card with custom options')
    .addStringOption(option => option.setName('topic').setDescription('The question or query to vote on').setRequired(true))
    .addStringOption(option => option.setName('choice1').setDescription('First selection option').setRequired(true))
    .addStringOption(option => option.setName('choice2').setDescription('Second selection option').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Deploys an active prize raffle event with reaction buttons')
    .addStringOption(option => option.setName('reward').setDescription('Item or prize being given away').setRequired(true))
    .addIntegerOption(option => option.setName('winners').setDescription('Total number of winners allowed').setRequired(true))
    .addIntegerOption(option => option.setName('time').setDescription('Duration length in minutes').setRequired(true)),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a digital coin for quick decision making')
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

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

// Interaction handler for commands and dynamic components
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Interactive Poll Voting Logic
    if (customId.startsWith('vote_')) {
      const [, pollId, optionNum] = customId.split('_');
      const pollRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`;
      
      const res = await fetch(pollRef);
      const pollData = await res.json();

      if (!pollData) {
        return interaction.reply({ content: '❌ This poll session has expired or no longer exists.', ephemeral: true });
      }

      if (pollData.voters && pollData.voters[interaction.user.id]) {
        return interaction.reply({ content: '⚠️ You have already cast your vote in this poll.', ephemeral: true });
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
        .setDescription(`**${pollData.topic}**\n\n🟢 **[Option 1]** ${pollData.opt1} — \`${v1}\` votes\n🔵 **[Option 2]** ${pollData.opt2} — \`${v2}\` votes`);

      await interaction.message.edit({ embeds: [updatedEmbed] });
      return interaction.reply({ content: `✅ Successfully recorded your vote for option **${optionNum === '1' ? pollData.opt1 : pollData.opt2}**!`, ephemeral: true });
    }

    // Giveaway Entry Button Logic
    if (customId.startsWith('enter_gw_')) {
      const giveawayId = customId.replace('enter_gw_', '');
      const userRef = `https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants/${interaction.user.id}.json`;
      
      const checkRes = await fetch(userRef);
      const joined = await checkRes.json();

      if (joined) {
        return interaction.reply({ content: '⚠️ You are already registered for this giveaway event!', ephemeral: true });
      }

      await fetch(userRef, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: interaction.user.tag, timestamp: Date.now() })
      });

      return interaction.reply({ content: '🎉 **Success!** Your entry has been logged for the raffle.', ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'speak') {
    const text = interaction.options.getString('content');
    await interaction.reply({ content: text });
  }

  else if (commandName === 'announce') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ You lack permission to execute announcements.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('destination');
    const text = interaction.options.getString('announcement');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: '❌ Selected target must be a text-based channel.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📢 Official Community Bulletin')
      .setDescription(text)
      .setFooter({ text: `Dispatched by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Announcement successfully delivered to ${channel}.`, ephemeral: true });
  }

  else if (commandName === 'poll') {
    const topic = interaction.options.getString('topic');
    const opt1 = interaction.options.getString('choice1');
    const opt2 = interaction.options.getString('choice2');
    const pollId = `poll_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/Polls/${pollId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, opt1, opt2, votes1: 0, votes2: 0, voters: {} })
    });

    const btn1 = new ButtonBuilder().setCustomId(`vote_${pollId}_1`).setLabel(opt1).setStyle(ButtonStyle.Success);
    const btn2 = new ButtonBuilder().setCustomId(`vote_${pollId}_2`).setLabel(opt2).setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(btn1, btn2);

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📊 Active Community Poll')
      .setDescription(`**${topic}**\n\n🟢 **[Option 1]** ${opt1} — \`0\` votes\n🔵 **[Option 2]** ${opt2} — \`0\` votes`)
      .setFooter({ text: `Reference ID: ${pollId}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  else if (commandName === 'giveaway') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permission is required to host giveaways.', ephemeral: true });
    }

    const prize = interaction.options.getString('reward');
    const winnersCount = interaction.options.getInteger('winners');
    const durationMins = interaction.options.getInteger('time');
    const endTime = Date.now() + (durationMins * 60 * 1000);
    const giveawayId = `gw_${Date.now()}`;

    await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prize, participants: {}, status: 'active', endTime })
    });

    const joinButton = new ButtonBuilder()
      .setCustomId(`enter_gw_${giveawayId}`)
      .setLabel('🎁 Tap to Enter Giveaway')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(joinButton);

    const embed = new EmbedBuilder()
      .setColor('#ff007f')
      .setTitle('🎉 SPECIAL EVENT GIVEAWAY 🎉')
      .setDescription(`Prize Package: **${prize}**\nTotal Winners: **${winnersCount}**\nCloses: <t:${Math.floor(endTime / 1000)}:R>\n\nClick the button below to join the draw!`)
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp(endTime);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    setTimeout(async () => {
      try {
        const res = await fetch(`https://donate-modded-2b27d-default-rtdb.firebaseio.com/ActiveGiveaways/${giveawayId}/participants.json`);
        const participantsObj = await res.json();

        if (!participantsObj) {
          return msg.edit({ content: `❌ Giveaway for **${prize}** concluded, but zero entries were submitted.`, embeds: [], components: [] });
        }

        const userIds = Object.keys(participantsObj);
        const winners = [];

        for (let i = 0; i < Math.min(winnersCount, userIds.length); i++) {
          const randomIndex = Math.floor(Math.random() * userIds.length);
          winners.push(participantsObj[userIds[randomIndex]].username);
          userIds.splice(randomIndex, 1);
        }

        const endedEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🏆 GIVEAWAY WINNER RESULTS 🏆')
          .setDescription(`Prize: **${prize}**\n\n👑 **Lucky Winner(s):**\n${winners.map(w => `• @${w}`).join('\n')}`)
          .setTimestamp();

        await msg.edit({ embeds: [endedEmbed], components: [] });
        await interaction.followUp({ content: `🎊 Massive congratulations to ${winners.map(w => `@${w}`).join(', ')} for winning **${prize}**!` });
      } catch (err) {
        console.error('Giveaway execution error:', err);
      }
    }, durationMins * 60 * 1000);
  }

  else if (commandName === 'coinflip') {
    const outcome = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
    const embed = new EmbedBuilder()
      .setColor('#fee75c')
      .setTitle('🎲 Coin Flip Result')
      .setDescription(`The coin landed on: **${outcome}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// Secure login using TOKEN2 with TOKEN fallback
client.login(process.env.TOKEN2 || process.env.TOKEN);
