// ============================
// SLASH COMMANDS
// ============================

const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Makes the bot say whatever you type')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message')
        .setRequired(true)
    )

].map(command => command.toJSON());


// ============================
// REGISTER COMMANDS
// ============================

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const GUILD_ID = '1430150908490027090';

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN2);

  try {
    console.log('Refreshing slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands loaded!');
  } catch (error) {
    console.error(error);
  }
});


// ============================
// HANDLE COMMANDS
// ============================

client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /say
  if (commandName === 'say') {
    const message = interaction.options.getString('message');
    return interaction.reply({ content: message });
  }

  // /announce
  else if (commandName === 'announce') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📢 Announcement')
      .setDescription(message)
      .setFooter({ text: `By ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: '✅ Announcement sent!',
      ephemeral: true
    });
  }

  // /dm
  else if (commandName === 'dm') {
    const user = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    try {
      await user.send(message);

      return interaction.reply({
        content: `✅ Sent a DM to ${user.tag}`,
        ephemeral: true
      });

    } catch {

      return interaction.reply({
        content: '❌ Could not send the DM.',
        ephemeral: true
      });

    }
  }

});


// ============================
// LOGIN
// ============================

client.login(process.env.TOKEN2);
