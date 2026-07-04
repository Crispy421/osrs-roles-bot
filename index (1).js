/**
 * OSRS Event Role Assignment Bot
 * -------------------------------
 * Posts a message with buttons in a channel. Simple buttons toggle a
 * single role on/off. "Bossing" and "Raids" are categories: clicking
 * either opens a private (ephemeral) multi-select dropdown just for
 * that user, listing the specific bosses/raids. Selected items show a
 * checkmark and stay checked (re-opens pre-populated with whatever
 * roles the user currently holds) until they deselect them.
 *
 * Setup:
 *  1. npm install
 *  2. Copy .env.example to .env and fill in DISCORD_TOKEN
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
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require('discord.js');

// ---- Simple toggle-on-click roles (top-level buttons that aren't categories) ----
const ROLE_BUTTONS = [
  { customId: 'role_pvp', label: 'PvP / Wilderness', emoji: '⚔️', roleName: 'PvP Events', style: ButtonStyle.Secondary },
];

// ---- Category definitions ----
// Each category gets its own top-level button, which opens a private
// multi-select dropdown listing its sub-roles. Role names must exactly
// match roles that exist in your server.
const CATEGORIES = {
  bossing: {
    buttonCustomId: 'category_bossing',
    buttonLabel: 'Bossing',
    buttonEmoji: '🐉',
    buttonStyle: ButtonStyle.Danger,
    selectCustomId: 'bossing_select',
    placeholder: 'Select your bosses',
    prompt: 'Pick the bosses you want to be pingable for. Selections stay checked until you remove them here.',
    // Emojis are each boss's pet. Discord has no built-in OSRS pet emojis,
    // so these must be CUSTOM emojis uploaded to your server. Upload the
    // pet image, then replace PUT_EMOJI_ID_HERE with its real ID (see README).
    roles: [
      { value: 'yama', label: 'Yama', description: 'Yama', emoji: { name: 'yami', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Yama' },
      { value: 'nightmare', label: 'Nightmare', description: 'The Nightmare of Ashihama', emoji: { name: 'littlenightmare', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Nightmare' },
      { value: 'royal_titans', label: 'Royal Titans', description: 'The Royal Titans', emoji: { name: 'branric', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Royal Titans' },
      { value: 'hueycoatl', label: 'Hueycoatl', description: 'The Hueycoatl', emoji: { name: 'huberte', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'Hueycoatl' },
    ],
  },
  raids: {
    buttonCustomId: 'category_raids',
    buttonLabel: 'Raids',
    buttonEmoji: '🏆',
    buttonStyle: ButtonStyle.Primary,
    selectCustomId: 'raid_select',
    placeholder: 'Select your raids',
    prompt: 'Pick the raids you want to be pingable for. Selections stay checked until you remove them here.',
    // Emojis are the raid's pet. Discord has no built-in OSRS pet emojis,
    // so these must be CUSTOM emojis uploaded to your server. Upload the
    // pet image, then replace PUT_EMOJI_ID_HERE with its real ID (see README).
    roles: [
      { value: 'cox', label: 'CoX', description: 'Chambers of Xeric', emoji: { name: 'olmlet', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'CoX' },
      { value: 'toa', label: 'ToA', description: 'Tombs of Amascut', emoji: { name: 'tumekensguardian', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'ToA' },
      { value: 'tob', label: 'ToB', description: 'Theatre of Blood', emoji: { name: 'lilzik', id: 'PUT_EMOJI_ID_HERE' }, roleName: 'ToB' },
    ],
  },
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

// ---- Permission check for !setup-roles ----
// Currently OFF: anyone can run !setup-roles. To restrict it again, set
// REQUIRE_SETUP_PERMISSION to true below (uses OWNER_ID / OWNER_ROLE_ID /
// COORDINATOR_ROLE_ID / TEMPLAR_ROLE_ID from .env).
const REQUIRE_SETUP_PERMISSION = false;
const OWNER_ID = process.env.OWNER_ID;
const SETUP_ROLE_IDS = [
  process.env.OWNER_ROLE_ID,
  process.env.COORDINATOR_ROLE_ID,
  process.env.TEMPLAR_ROLE_ID,
].filter(Boolean);

function hasSetupPermission(member) {
  if (!REQUIRE_SETUP_PERMISSION) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return true;
  if (OWNER_ID && member.id === OWNER_ID) return true;
  return member.roles.cache.some((r) => SETUP_ROLE_IDS.includes(r.id));
}

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
      'Click a button below to **join** or **leave** an event role.\n' +
      'Click **🐉 Bossing** or **🏆 Raids** to pick specific bosses/raids ' +
      'from a private menu.\n\n' +
      'Once you have a role, anyone can `@mention` it to notify everyone ' +
      'signed up when that event is happening.'
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

  const simpleButtons = ROLE_BUTTONS.map((r) =>
    new ButtonBuilder()
      .setCustomId(r.customId)
      .setLabel(r.label)
      .setEmoji(r.emoji)
      .setStyle(r.style ?? ButtonStyle.Secondary)
  );

  const allButtons = [...categoryButtons, ...simpleButtons];
  const rows = chunkIntoRows(allButtons, 3).map((chunk) => new ActionRowBuilder().addComponents(chunk));

  await message.channel.send({ embeds: [embed], components: rows });
  await message.delete().catch(() => {});
});

// ---- Interaction handling ----
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      const categoryKey = Object.keys(CATEGORIES).find((key) => CATEGORIES[key].buttonCustomId === interaction.customId);
      if (categoryKey) {
        return await sendCategoryMenu(interaction, categoryKey, false);
      }

      const config = ROLE_BUTTONS.find((r) => r.customId === interaction.customId);
      if (!config) return;

      const role = findRole(interaction.guild, config.roleName);
      if (!role) {
        return interaction.reply({
          content: `⚠️ The role **${config.roleName}** doesn't exist yet. Ask an admin to create it.`,
          ephemeral: true,
        });
      }

      return await toggleSingleRole(interaction, role, config.roleName);
    }

    if (interaction.isStringSelectMenu()) {
      const categoryKey = Object.keys(CATEGORIES).find((key) => CATEGORIES[key].selectCustomId === interaction.customId);
      if (categoryKey) {
        return await handleCategorySelect(interaction, categoryKey);
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

// Toggle a plain on/off role (non-category buttons)
async function toggleSingleRole(interaction, role, displayName) {
  const member = interaction.member;
  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      await interaction.reply({ content: `❌ Removed **${displayName}**.`, ephemeral: true });
    } else {
      await member.roles.add(role);
      await interaction.reply({ content: `✅ Added **${displayName}**. You'll be pingable for those events.`, ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: '⚠️ I couldn\'t update your roles. Make sure my role is positioned above the roles I need to assign.',
      ephemeral: true,
    });
  }
}

// Build (or rebuild) a category's select menu, pre-checked with roles the user already has
function buildCategorySelectRow(categoryKey, member) {
  const category = CATEGORIES[categoryKey];
  const menu = new StringSelectMenuBuilder()
    .setCustomId(category.selectCustomId)
    .setPlaceholder(category.placeholder)
    .setMinValues(0)
    .setMaxValues(category.roles.length)
    .addOptions(
      category.roles.map((r) => {
        const option = {
          value: r.value,
          label: r.label,
          description: r.description,
          default: memberHasRoleName(member, r.roleName), // pre-checked / highlighted
        };
        if (isValidEmoji(r.emoji)) option.emoji = r.emoji;
        return option;
      })
    );

  return new ActionRowBuilder().addComponents(menu);
}

async function sendCategoryMenu(interaction, categoryKey, isUpdate) {
  const category = CATEGORIES[categoryKey];
  const row = buildCategorySelectRow(categoryKey, interaction.member);
  const payload = { content: category.prompt, components: [row], ephemeral: true };

  if (isUpdate) {
    await interaction.update(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function handleCategorySelect(interaction, categoryKey) {
  const category = CATEGORIES[categoryKey];
  const guild = interaction.guild;
  const member = interaction.member;
  const selected = new Set(interaction.values);

  const toAdd = [];
  const toRemove = [];

  for (const r of category.roles) {
    const role = findRole(guild, r.roleName);
    if (!role) continue; // skip missing roles silently

    const wants = selected.has(r.value);
    const has = member.roles.cache.has(role.id);

    if (wants && !has) toAdd.push(role);
    if (!wants && has) toRemove.push(role);
  }

  try {
    if (toAdd.length) await member.roles.add(toAdd);
    if (toRemove.length) await member.roles.remove(toRemove);
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: '⚠️ I couldn\'t update your roles. Make sure my role sits above these roles.',
      ephemeral: true,
    });
  }

  // Re-render the same ephemeral message with refreshed checkmarks
  return sendCategoryMenu(interaction, categoryKey, true);
}

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name);
}

// A real Discord snowflake ID is a string of digits (typically 17-20 long).
// This catches leftover placeholders like "PUT_EMOJI_ID_HERE" so we don't
// send Discord an invalid emoji and have the whole interaction silently fail.
function isValidEmoji(emoji) {
  return !!emoji && typeof emoji.id === 'string' && /^\d{15,25}$/.test(emoji.id);
}

function memberHasRoleName(member, roleName) {
  const role = findRole(member.guild, roleName);
  return role ? member.roles.cache.has(role.id) : false;
}

function chunkIntoRows(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

client.login(process.env.DISCORD_BOT_TOKEN);
