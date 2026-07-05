# OSRS Event Role Menu Bot

A Discord bot that posts a button menu so people can self-assign OSRS
event roles. "Bossing" and "Raids" are categories — clicking either opens
a private menu just for that user, with one toggle button per boss/raid.
Once someone has a role, anyone can `@mention` it to ping everyone who
wants that event.

## 1. Create the Discord application
1. Go to https://discord.com/developers/applications → **New Application**.
2. Go to **Bot** → **Add Bot** → copy the token (you'll need it below).
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** and
   **Message Content Intent**.
4. Go to **OAuth2 → URL Generator**, check scopes `bot`, and permissions
   `Manage Roles`, `Send Messages`, `View Channels`, `Embed Links`,
   `Manage Messages` (needed so the bot can delete the `!setup-roles`
   command message and auto-delete the role-menu message). Use the
   generated URL to invite the bot to your server.

   **If the bot is already in your server** and just needs `Manage
   Messages` added, you don't need to re-invite it — just go to Server
   Settings → Roles → click the bot's role → toggle on **Manage Messages**.
   This takes effect immediately.

## 2. Create the roles in your server
In Server Settings → Roles, create roles with these exact names (or edit
`CATEGORIES` in `index.js` to match your own names):

Bossing (picked from the private "Bossing" menu):
- Yama
- Nightmare
- Royal Titans
- Hueycoatl

Raids (picked from the private "Raids" menu):
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
   Until you do this, the bot skips the emoji automatically and just shows
   the plain text label — it won't break anything.

## 3. Install and run
```bash
npm install
cp .env.example .env
# fill in your bot token and IDs in .env
npm start
```

## 4. Post the role menu
In the channel where you want the menu, type:
```
!setup-roles
```
Anyone can run this — no permission check. The bot posts an embed with
**Bossing** and **Raids** buttons.

- Clicking a category button opens a private menu (only you see it) with
  one button per boss/raid.
- Clicking a boss/raid button toggles that role on/off for you. Selected
  ones turn **red** and stay red until you click them again to remove them.
- Your `!setup-roles` command message is deleted automatically 5 seconds
  after the bot successfully posts the menu (if posting fails for some
  reason, your command message is left in place so you can see the error
  and retry).
- The public role-menu message, **and** each private Bossing/Raids submenu,
  auto-delete after 60 seconds. This only removes the messages — any roles
  you've already picked stay assigned regardless.

## Customizing
- Edit `MENU_MESSAGE_LIFETIME_MS` to change how long the menu message stays
  posted before auto-deleting (in milliseconds; default is 60000 = 60s).
- Edit `CATEGORIES` to add/remove categories entirely, or add/remove roles
  within `bossing.roles` / `raids.roles` (label, role name, optional emoji).
- The top-level **Bossing** button uses a custom emoji (ID
  `1381713946591105187`). If the placeholder `name: 'bossing'` doesn't
  match that emoji's actual name in your server, update it in
  `CATEGORIES.bossing.buttonEmoji` — Discord looks up the emoji mainly by
  ID, but keeping the name accurate avoids any rendering hiccups.
- The top-level **Raids** button uses the 💰 money bags emoji.

## Troubleshooting: "the !setup-roles message isn't deleting"
This almost always means the bot is missing the **Manage Messages**
permission in that channel (deleting a message it didn't send, or in some
cases even its own message, requires it). Check your bot's logs — it
logs an error like `Could not delete !setup-roles command message (likely
missing Manage Messages permission)` when this happens.

**Fix (confirmed working):** Server Settings → Roles → click the bot's
role → toggle on **Manage Messages**. No re-invite needed, takes effect
immediately.

If that role-level toggle doesn't fix it, also check the specific
channel's permission overrides — a channel can override and deny
**Manage Messages** for the bot's role even if it's enabled server-wide.
