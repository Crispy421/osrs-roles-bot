# OSRS Event Role Menu Bot

A Discord bot that posts a button menu so people can self-assign OSRS
event roles. "Bossing" and "Raids" are categories — clicking either opens
a private dropdown just for that user to pick specific bosses/raids.
Once someone has a role, anyone can `@mention` it to ping everyone who
wants that event.

## 1. Create the Discord application
1. Go to https://discord.com/developers/applications → **New Application**.
2. Go to **Bot** → **Add Bot** → copy the token (you'll need it below).
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** and
   **Message Content Intent**.
4. Go to **OAuth2 → URL Generator**, check scopes `bot`, and permissions
   `Manage Roles`, `Send Messages`, `View Channels`, `Embed Links`. Use the
   generated URL to invite the bot to your server.

## 2. Create the roles in your server
In Server Settings → Roles, create roles with these exact names (or edit
`ROLE_BUTTONS` / `CATEGORIES` in `index.js` to match your own names):

Simple toggle role:
- PvP Events

Bossing (picked from the private "Bossing" submenu):
- Yama
- Nightmare
- Royal Titans
- Hueycoatl

Raids (picked from the private "Raids" submenu):
- CoX
- ToA
- ToB

**Important:** drag the bot's own role above all of these roles in the role
list, or it won't be able to assign them.

## 2b. Set up the boss/raid pet emojis
Discord has no built-in OSRS pet emojis, so these need to be **custom
emojis** you upload yourself:
1. Enable Developer Mode: User Settings → Advanced → Developer Mode.
2. Save images of each pet from the OSRS Wiki:
   - Yama → **Yami**
   - Nightmare → **Little Nightmare**
   - Royal Titans → **Bran/Ric**
   - Hueycoatl → **Huberte**
   - CoX → **Olmlet**
   - ToA → **Tumeken's Guardian**
   - ToB → **Lil' Zik**
3. In Server Settings → Emoji, upload each one and give it a name
   (e.g. `yami`, `littlenightmare`, `branric`, `huberte`, `olmlet`,
   `tumekensguardian`, `lilzik`).
4. Type the emoji in any Discord chat box (e.g. `:yami:`), right-click it
   in the autocomplete or after sending, and choose **Copy ID**.
5. In `index.js`, find each entry under `CATEGORIES.bossing.roles` and
   `CATEGORIES.raids.roles`, and replace `PUT_EMOJI_ID_HERE` with the ID
   you copied, e.g.:
   ```js
   emoji: { name: 'yami', id: '1234567890123456789' }
   ```
   If the pet image is animated (a `.gif`), also add `animated: true`.

## 3. Install and run
```bash
npm install
cp .env.example .env
# fill in your bot token and IDs in .env
npm start
```

`.env` holds:
- `DISCORD_BOT_TOKEN` — your bot's token (never commit this or share it in chat/screenshots — a `.gitignore` is included so it won't get pushed to GitHub)
- `CLIENT_ID` — your application's client ID (public, safe to share)
- `CLAN_ID` — your server's guild ID
- `OWNER_ID` — your own Discord user ID; this user can always run `!setup-roles`, even without a matching role
- `OWNER_ROLE_ID` / `COORDINATOR_ROLE_ID` / `TEMPLAR_ROLE_ID` — role IDs that are also allowed to run `!setup-roles`

## 4. Post the role menu
In the channel where you want the menu, type:
```
!setup-roles
```
Anyone can run this command right now — no permission check. The bot posts
an embed with buttons — **Bossing** and **Raids** open a private
multi-select dropdown, **PvP / Wilderness** toggles directly.

### Re-enabling a permission check (optional)
If you want to lock `!setup-roles` down later, open `index.js` and set:
```js
const REQUIRE_SETUP_PERMISSION = true;
```
This turns permission checking back on: anyone with **Manage Roles**, the
Owner/Coordinator/Templar role, or the user matching `OWNER_ID` in `.env`
will be allowed to run it — everyone else gets a polite refusal.

## How the category submenus work
Clicking **🐉 Bossing** or **🏆 Raids** opens a private dropdown (only you
can see it) listing that category's roles. Items you already have show a
checkmark. Pick/unpick and the bot updates your roles, then re-shows the
same dropdown with the checkmarks refreshed — so your selections stay
visibly checked until you remove them.

## Customizing
- Edit `ROLE_BUTTONS` to add/remove simple top-level toggle roles.
- Edit `CATEGORIES` to add/remove categories entirely, or add/remove roles
  within `bossing.roles` / `raids.roles` (label, description, role name,
  optional emoji).
