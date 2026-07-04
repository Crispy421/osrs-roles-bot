/**
 * OSRS Event Role Assignment Bot
 * -------------------------------
 * Posts a message with buttons in a channel. "Bossing" and "Raids" are
 * categories: clicking either opens a private (ephemeral) menu just for
 * that user, with one toggle button per boss/raid. Selected ones turn
 * RED (Danger style) and stay red until clicked again to deselect —
 * the menu re-opens/refreshes showing red for whatever roles the user
 * currently holds.
 *
 * The original role-menu message in the channel auto-deletes itself
 * 60 seconds after being posted. This has no effect on roles already
 * assigned — deleting the message does not remove anyone's roles.
 *
 * Setup:
 *  1. npm install
 *  2. Copy .env.example to .env and fill in DISCORD_BOT_TOKEN etc.
 *  3. Create all roles listed below in your server (exact names)
 *  4. Invite the bot with "Manage Roles", and drag its role ABOVE
 *     all roles it needs to assign
 *  5. node index.js
 *  6. In the target channel, type: !setup-roles (anyone can run this)
 */

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');

// How long the posted role-menu message stays in the channel before
// auto-deleting. Roles already assigned are unaffected by this.
const MENU_MESSAGE_LIFETIME_MS = 60 * 1000;

// ---- Category definitions ----
// Each category gets its own top-level button, which opens a private
// message with one toggle button per role. Role names must exactly
// match roles that exist in your server.
const CATEGORIES = {
  bossing: {
    buttonCustomId: 'category_bossing',
    buttonLabel: 'Bossing',
    buttonEmoji: '🐉',
    buttonStyle: ButtonStyle.Primary,
    prompt: 'Pick the bosses you want to be pingable for. Selected ones turn red and stay red until you click them again.',
    // Emojis are each boss's pet. Discord has no built-in OSRS pet emojis,
    // so these must be CUSTOM emojis uploaded to your server. Upload the
    // pet image, then replace PUT_EMOJI_ID_HERE with its real ID (see README).
    roles: [
      { value: 'yama', label: 'Yama', emoji: { name: 'yami', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Yama' },
      { value: 'nightmare', label: 'Nightmare', emoji: { name: 'littlenightmare', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Nightmare' },
      { value: 'royal_titans', label: 'Royal Titans', emoji: { name: 'branric', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Royal Titans' },
      { value: 'hueycoatl', label: 'Hueycoatl', emoji: { name: 'huberte', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Hueycoatl' },
    ],
  },
  raids: {
    buttonCustomId: 'category_raids',
    buttonLabel: 'Raids',
    buttonEmoji: '🏆',
    buttonStyle: ButtonStyle.Primary,
    prompt: 'Pick the raids you want to be pingable for. Selected ones turn red and stay red until you click them again.',
    roles: [
      { value: 'cox', label: 'CoX', emoji: { name: 'olmlet', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'CoX' },
      { value: 'toa', label: 'ToA', emoji: { name: 'tumekensguardian', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'ToA' },
      { value: 'tob', label: 'ToB', emoji: { name: 'lilzik', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'ToB' },
    ],
  },
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---- Command to post the role menu: !setup-roles ----
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.content.trim() !== '!setup-roles') return;

  // Anyone can run !setup-roles — no permission check.

  const embed = new EmbedBuilder()
    .setTitle('⚔️ OSRS Event Roles')
    .setDescription(
      'Click **🐉 Bossing** or **🏆 Raids** to pick specific bosses/raids ' +
      'from a private menu. Selected ones turn red.\n\n' +
      'Once you have a role, anyone can `@mention` it to notify everyone ' +
      'signed up when that event is happening.\n\n' +
      '_This message will delete itself in 60 seconds — your roles stay either way._'
    )
    .setColor(0xc2a24c)
    .setFooter({ text: 'Old School RuneScape Event Notifications' });

  const categoryButtons = Object.values(CATEGORIES).map((cat) =>
    new ButtonBuilder()
      .setCustomId(cat.buttonCustomId)
      .setLabel(cat.buttonLabel)
      .setEmoji(cat.buttonEmoji)
      .setStyle(cat.buttonStyle)
  );

  const row = new ActionRowBuilder().addComponents(categoryButtons);

  const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
  await message.delete().catch(() => {});

  setTimeout(() => {
    sentMessage.delete().catch(() => {});
  }, MENU_MESSAGE_LIFETIME_MS);
});

// ---- Interaction handling ----
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      // Top-level category button -> open private toggle menu
      const categoryKey = Object.keys(CATEGORIES).find((key) => CATEGORIES[key].buttonCustomId === interaction.customId);
      if (categoryKey) {
        return await sendCategoryMenu(interaction, categoryKey, false);
      }

      // Role toggle button inside a category menu (customId: "roletoggle:<category>:<value>")
      if (interaction.customId.startsWith('roletoggle:')) {
        const [, categoryKey, value] = interaction.customId.split(':');
        return await handleRoleToggle(interaction, categoryKey, value);
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const payload = { content: '⚠️ Something went wrong handling that. Check the bot logs for details.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// Build the row(s) of toggle buttons for a category, red if the user already has that role
function buildCategoryButtonRows(categoryKey, member) {
  const category = CATEGORIES[categoryKey];

  const buttons = category.roles.map((r) => {
    const has = memberHasRoleName(member, r.roleName);
    const btn = new ButtonBuilder()
      .setCustomId(`roletoggle:${categoryKey}:${r.value}`)
      .setLabel(r.label)
      .setStyle(has ? ButtonStyle.Danger : ButtonStyle.Secondary);
    if (isValidEmoji(r.emoji)) btn.setEmoji(r.emoji);
    return btn;
  });

  return chunkIntoRows(buttons, 5).map((chunk) => new ActionRowBuilder().addComponents(chunk));
}

async function sendCategoryMenu(interaction, categoryKey, isUpdate) {
  const category = CATEGORIES[categoryKey];
  const rows = buildCategoryButtonRows(categoryKey, interaction.member);
  const payload = { content: category.prompt, components: rows, ephemeral: true };

  if (isUpdate) {
    await interaction.update(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function handleRoleToggle(interaction, categoryKey, value) {
  const category = CATEGORIES[categoryKey];
  if (!category) return;

  const roleConfig = category.roles.find((r) => r.value === value);
  if (!roleConfig) return;

  const guild = interaction.guild;
  const member = interaction.member;
  const role = findRole(guild, roleConfig.roleName);

  if (!role) {
    return interaction.reply({
      content: `⚠️ The role **${roleConfig.roleName}** doesn't exist yet. Ask an admin to create it.`,
      ephemeral: true,
    });
  }

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
    } else {
      await member.roles.add(role);
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: '⚠️ I couldn\'t update your roles. Make sure my role sits above these roles.',
      ephemeral: true,
    });
  }

  // Re-render the same ephemeral message with the button now toggled red/grey
  return sendCategoryMenu(interaction, categoryKey, true);
}

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name);
}

function memberHasRoleName(member, roleName) {
  const role = findRole(member.guild, roleName);
  return role ? member.roles.cache.has(role.id) : false;
}

// A real Discord snowflake ID is a string of digits (typically 17-20 long).
// This catches leftover placeholders like "PUT_EMOJI_ID_HERE" so we don't
// send Discord an invalid emoji and have the whole interaction silently fail.
function isValidEmoji(emoji) {
  return !!emoji && typeof emoji.id === 'string' && /^\d{15,25}$/.test(emoji.id);
}

function chunkIntoRows(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

client.login(process.env.DISCORD_BOT_TOKEN);
