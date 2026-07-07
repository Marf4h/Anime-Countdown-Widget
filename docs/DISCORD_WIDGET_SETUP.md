# Discord Widget Setup Guide

This guide explains how to create, authorize, install, and connect the Discord Developer Application used by Anime Countdown Discord Widget.

## Features

- Uses public AniList anime metadata
- No AniList login or AniList API key required
- Supports anime search/autocomplete through `/setanime`
- Supports AniList anime IDs
- Shows current aired episode count
- Shows next episode countdown
- Shows AniList mean score, or `TBA` if no score is available yet
- Supports cover and banner images from AniList
- Supports manual episode airing overrides for delays
- Syncs AniList data on startup, command use, and after episode release
- Uses local countdown calculation to avoid spamming the AniList API
- Includes basic rate-limit and failure protection

## Requirements

Before setting up the bot, make sure you have:

- Node.js 18 or newer
- npm
- A Discord Developer Application
- A Discord bot token
- Discord Profile Widget / Social SDK access
- An AniList anime title or AniList anime ID

AniList login is not required.  
This bot only reads public anime metadata from AniList.

## Project Files

```txt
Anime-Countdown-Widget/
├──docs
│   └──DISCORD_WIDGET_SETUP.md
├── .env.example
├── LICENCE
├── NOTICE
├── README.md
├── config.example.json
├── discord_portal.json
├── package.json
├── state.example.json
└── sync.js
```

Files that should stay private and should not be uploaded on Anywhere:

```txt
.env
config.json
state.json
node_modules/
```

## Setup Tutorial

### 1. Download or clone the project

Clone the repository:

```bash
git clone https://github.com/Marf4h/Anime-Countdown-Widget.git
cd anime-countdown-widget
```

Or download the project as a ZIP from GitHub and extract it.

### 2. Install dependencies

Run this inside the project folder:

```bash
npm install
```

This installs the required packages from `package.json`.

### 3. Create, authorize, and connect your Discord application

This is the most important setup step.

The bot needs a Discord Developer Application, but the application also needs to be connected to your Discord account and Profile Widget system.

There are four parts:

1. Create the Discord application and bot.
2. Enable / set up Social SDK access.
3. Authorize and install the application to your Discord account.
4. Create or import the widget layout.

---

#### 3.1 Create the Discord application

Go to the [Discord Developer Portal](https://discord.com/developers/applications).

1. Click **New Application**.
2. Give the application a name.
3. Open the application.
4. Go to **General Information**.
5. Copy the **Application ID**.

You will use this later in `.env`:

```env
APPLICATION_ID=your_discord_application_id
```

---

#### 3.2 Create the bot token

In the same Discord application:

1. Go to **Bot**.
2. Click **Add Bot** if there is no bot yet.
3. Click **Reset Token** or **View Token**.
4. Copy the bot token.

You will use this later in `.env`:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
```

Keep this token private.

Never upload it to GitHub, Discord, screenshots, or public chats.

---

#### 3.3 Get your Discord user ID

The bot only accepts commands from the Discord user ID you put in `.env`.

To get your Discord user ID:

1. Open Discord.
2. Go to **User Settings**.
3. Go to **Advanced**.
4. Enable **Developer Mode**.
5. Right-click your own Discord profile.
6. Click **Copy User ID**.

You will use this later in `.env`:

```env
DISCORD_USER_ID=your_discord_user_id
```

---

#### 3.4 Enable Social SDK

In the Discord Developer Portal, open your application.

On the left sidebar, open the collapsible section named **Games**.

You should see options like:

```txt
Claim Game
Game Identity
Social SDK
Widget
```

The **Widget** page may only appear after widget access is activated.

Open **Social SDK**.

Fill out the required form, You can Fill it with whatever just make sure its has something filled. This is needed so the application can use the Social SDK / Profile Widget features.

After filling it out, save the form.

---

#### 3.5 Add a redirect URI

Still in your Discord application, open **OAuth2** from the left sidebar.

Find the **Redirects** box.

Click **Add Redirect**.

Add this redirect URI:

```txt
https://discord.com
```

Save changes.

This redirect URI will be used for the authorization URL.

---

#### 3.6 Generate the OAuth2 authorization URL

On the same **OAuth2** page, scroll down to **OAuth2 URL Generator**.

Enable these scopes:

```txt
openid
sdk.social_layer
```

Make sure you select:

```txt
sdk.social_layer
```

not:

```txt
sdk.social_layer_presence
```

Then find **Select redirect URI** and choose the redirect URI you added earlier:

```txt
https://discord.com
```

Discord will generate a URL under **Generated URL**.

Copy that generated URL.

---

#### 3.7 Important: change `response_type=code` to `response_type=token`

Before opening the generated URL, edit it first.

Discord may generate a URL containing this:

```txt
response_type=code&redirect_uri
```

Change it to:

```txt
response_type=token&redirect_uri
```

So this:

```txt
response_type=code
```

becomes this:

```txt
response_type=token
```

This is important for the Profile Widget / Social SDK authorization flow.

After changing it, open the edited URL in your browser.

Authorize the application using the correct Discord account.

If the authorization worked, Discord may redirect you to a URL containing something like:

```txt
#access_token=...
```

DO NOT share that redirected URL with anyone.

DO NOT copy the access token into your project.

DO NOT put it in `.env`.

---

#### 3.8 Configure Installation settings

Now go back to your Discord application in the Developer Portal.

Open **Installation** from the left sidebar.

This page is usually under **General Information**.

Find **Installation Contexts**.

Enable:

```txt
User Install
Guild Install
```

For this project, **User Install** is required.

**Guild Install** is optional, but you can enable it if you also want to install the bot to a server.

---

#### 3.9 Configure Default Install Settings

Still on the **Installation** page, scroll down to **Default Install Settings**.

For **User Install**, add this scope:

```txt
applications.commands
```

For **Guild Install**, add this scope:

```txt
bot
```

After adding the `bot` scope, a **Permissions** box should appear.

In the permissions box, enable:

```txt
Embed Links
Send Messages
Use Slash Commands
```

Depending on Discord’s UI, **Use Slash Commands** may also appear as:

```txt
Use Application Commands
```

After this is done, click **Save Changes**.

---

#### 3.10 Install the application to your Discord account

Still on the **Installation** page, scroll back up and find **Install Link**.

Copy the install link.

Open it in your browser.

Discord should show install options such as:

```txt
Add to my Apps
Add to Server
```

For this tutorial, choose:

```txt
Add to my Apps
```

This is required.

Adding the bot to a server is optional and does not directly help the Profile Widget setup, but you can do it if you want server access too.

Make sure you are installing the correct Discord application.

---

#### 3.11 Set up the Discord Profile Widget layout

You have two options:

1. Import the included preset widget layout.
2. Create your own widget layout manually.

The preset route is recommended.

---

### Option A: Import the included preset widget layout

This repository includes:

```txt
discord_portal.json
```

This file contains a preset widget layout.

To import it, you need a userscript manager such as:

```txt
Tampermonkey
ScriptCat
ScriptVault
```

Then install the Discord Widget Configurator userscript:

```txt
https://github.com/ItzMeShadow999/Discord_Widget_Configurator
```

After installing the userscript:

1. Refresh the Discord Developer Portal page.
2. Open your Discord application.
3. A new button called **Widget Panel** should appear.
4. Click **Widget Panel**.
5. Scroll down.
6. Click **Query App Registry**.
7. Open the dropdown next to it.
8. Select your application.
9. Open the included `discord_portal.json` file from this repository.
10. Copy the contents of `discord_portal.json`.
11. Paste it into the import text box in the Widget Panel.
12. Click **Import Structure**.
13. Wait until the import button becomes available again.

After the import finishes, the widget layout should be added to your Discord application.

---

### Option B: Create your own widget layout manually

You can also create your own widget layout manually.

Use the dynamic variable names from the **Widget Dynamic Variables** section of this README.

If you get stuck, look at the included `discord_portal.json` preset and use it as a reference.

The important thing is that your widget layout uses the same dynamic variable names that the bot sends.

For example:

```txt
anime_title
episode_count
next_episode
countdown
mean_score
cover_image
banner_image
progress_percent
```

---

#### 3.12 Make sure everything belongs to the same application

Before continuing, double-check that all of these belong to the same Discord Developer Application:

- The `APPLICATION_ID` in `.env`
- The bot token in `.env`
- The OAuth2 authorization URL
- The Installation link
- The Profile Widget layout
- The imported `discord_portal.json` widget

If one of these comes from a different Discord application, the bot may log in correctly but the widget may not update.

### 4. Create your `.env` file

Copy `.env.example` and rename the copy to `.env`.

On Windows PowerShell:

```powershell
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Then open `.env` and fill it like this:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
APPLICATION_ID=your_discord_application_id
DISCORD_USER_ID=your_discord_user_id
```

### Environment variable explanation

| Variable | Required | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Yes | Your Discord bot token |
| `APPLICATION_ID` | Yes | Your Discord Developer Application ID |
| `DISCORD_USER_ID` | Yes | Your numeric Discord user ID |

The bot only accepts slash commands from the user ID in `DISCORD_USER_ID`.

### 5. Create your config file

Copy `config.example.json` and rename the copy to `config.json`.

On Windows PowerShell:

```powershell
copy config.example.json config.json
```

On macOS/Linux:

```bash
cp config.example.json config.json
```

You can either edit `config.json` manually, or start the bot and use `/setanime`.

### 6. Configure your anime

The easiest way is to use the bot command:

```txt
/setanime
```

You can search by anime title or paste an AniList anime ID.

You also need to provide the first episode airing time.

Example:

```txt
/setanime anime:Kimi ga Shinu first_episode:2026-07-07T20:30:00+08:00 total_episodes:13 title_preference:english
```

### 7. Use the correct date format

Use ISO date format with timezone offset.

Good examples:

```txt
2026-07-07T20:30:00+08:00
2026-07-10T00:30:00+09:00
```

Bad examples:

```txt
July 7 8:30 PM
7 July 2026
Tomorrow at 8 PM
```

The timezone offset is important because the countdown depends on it.

For Indonesia WITA, use:

```txt
+08:00
```

For Japan time, use:

```txt
+09:00
```

And for other timezones just search on google :)

### 8. Start the bot

Run:

```bash
npm start
```

Or:

```bash
node sync.js
```

If everything works, the bot should register slash commands and log in.

## Discord Widget Dynamic Variables

Use these variable names if you want to edit the preset widget or make your own widget.

The bot sends three types of variables:

| Type | Use for |
|---|---|
| Text | Normal readable text, labels, countdowns, titles |
| Number | Progress bars, counters, percentages, numeric widgets |
| Image | Cover art or banner image slots |

### Text Variables

| Variable | Example | Description |
|---|---|---|
| `anime_title` | `I Want to Love You Till Your Dying Day` | Anime title |
| `episode_count` | `Episode 3 / 13` | Ready-to-use episode progress text |
| `current_episode` | `3` | Current aired episode as text |
| `total_episodes` | `13` | Total episodes as text |
| `next_episode` | `Episode 4` | Next episode label |
| `countdown` | `4h 20m` | Time until next episode |
| `mean_score` | `82%` or `TBA` | AniList mean score |
| `airing_time` | `Tue, Jul 7, 08:30 PM GMT+8` | Full next airing time |
| `next_airing_date` | `Tue, Jul 7` | Short next airing date |
| `airing_status` | `Source: anilist` | Schedule source |
| `last_sync` | `7/7/2026, 6:12 PM` | Last AniList sync time |

### Image Variables

| Variable | Description |
|---|---|
| `cover_image` | AniList cover image. |
| `banner_image` | AniList banner image. |

### Number Variables

Use these for progress bars, counters, and numeric widget elements.

| Variable | Example | Description |
|---|---:|---|
| `current_episode_num` | `3` | Current aired episode as a number |
| `total_episodes_num` | `13` | Total episode count as a number |
| `next_episode_num` | `4` | Next episode number |
| `mean_score_num` | `82` | AniList score as a number. Shows `0` if unavailable |
| `progress_percent` | `23` | Episode progress from `0` to `100` |

### Which should I use?

For normal labels, use text variables:

```txt
anime_title
episode_count
next_episode
countdown
mean_score
```

For progress bars, use number variables:

```txt
current_episode_num
total_episodes_num
progress_percent
```

For images, use image variables:

```txt
cover_image
banner_image
```

## Slash Commands

| Command | Description |
|---|---|
| `/setanime` | Set the anime using AniList search or AniList ID |
| `/syncanime` | Manually sync AniList title, score, episodes, images, and airing data |
| `/refresh` | Push the current widget data to Discord |
| `/settitle` | Set a manual title override |
| `/cleartitle` | Remove the manual title override |
| `/setnext` | Manually override an episode airing time |
| `/clearoverrides` | Clear all manual episode overrides |
| `/status` | Show the currently calculated anime widget state |

## Command Examples

Set an anime:

```txt
/setanime anime:Kimi ga Shinu first_episode:2026-07-07T20:30:00+08:00 total_episodes:13 title_preference:english
```

Sync AniList data manually:

```txt
/syncanime
```

Refresh the widget manually:

```txt
/refresh
```

Set a manual title:

```txt
/settitle title:I Want to Love You Till Your Dying Day
```

Clear the manual title:

```txt
/cleartitle
```

Override a delayed episode:

```txt
/setnext episode:5 airing_at:2026-08-07T20:30:00+08:00 reason:Delayed by one week
```

Clear all manual schedule overrides:

```txt
/clearoverrides
```

Check current bot status:

```txt
/status
```

## How the Schedule Works

The bot decides the next episode using this priority:

```txt
Manual episode override > AniList next airing data > Local weekly prediction
```

### 1. Manual episode override

This has the highest priority.

Use this when an episode is delayed, skipped, or moved to a different time.

Example:

```txt
/setnext episode:5 airing_at:2026-08-07T20:30:00+08:00 reason:Delayed by one week
```

### 2. AniList next airing data

If AniList has next airing data, the bot can use it.

This helps correct the schedule when AniList knows the official next airing time.

### 3. Local weekly prediction

If no manual override or AniList next airing data is available, the bot calculates the schedule locally.

It uses:

```txt
firstEpisodeAt
intervalDays
```

For most weekly anime, `intervalDays` should be:

```json
7
```

## AniList Sync Behavior

The bot syncs AniList metadata:

- When the bot starts
- When `/setanime` is used
- When `/syncanime` is used
- After an episode airs and the release delay window passes

The countdown itself is calculated locally and updated on an interval.

This avoids making unnecessary AniList API requests.

## Config Notes

The real config file is:

```txt
config.json
```

The public example file is:

```txt
config.example.json
```

DO NOT upload your real `config.json` to GitHub.

Important config fields:

| Field | Description |
|---|---|
| `animeId` | AniList anime ID |
| `titlePreference` | Title style: `romaji`, `english`, or `native` |
| `manualTitle` | Optional manual title override |
| `firstEpisodeAt` | First episode airing time |
| `intervalDays` | Days between episodes |
| `totalEpisodesOverride` | Optional total episode override |
| `updateIntervalMinutes` | How often the Discord widget refreshes |
| `postReleaseAniListSyncDelayMinutes` | Delay before syncing AniList after an episode airs |
| `manualOverrides` | Manual episode airing overrides |

Recommended update interval:

```json
10
```

or:

```json
15
```

Do not set it too low.

## State File

The bot automatically creates:

```txt
state.json
```

This file stores runtime data such as:

- Cached AniList metadata
- Last AniList sync time
- Last widget push time
- Last skipped widget update
- Discord API error information
- Automatic update failsafe status

You usually do not need to edit this file manually.

DO NOT Upload this file Anywhere!  

## Troubleshooting

### Widget authorization problems

If the bot logs in and slash commands work, but the widget does not update, the Discord app may not be connected to your account correctly.

Check these:

- You enabled Social SDK.
- You added `https://discord.com` as a redirect URI.
- You selected the `openid` and `sdk.social_layer` scopes.
- You changed `response_type=code` to `response_type=token`.
- You installed the app using **Add to my Apps**.
- Your widget layout belongs to the same application ID in `.env`.

If you see:

```txt
Missing required OAuth2 scope
```

or:

```txt
code: 50026
```

reauthorize the app with:

```txt
openid
sdk.social_layer
```

If you see:

```txt
401 Unauthorized
```

or:

```json
{"message":"Unauthorized","code":40001}
```

check that the widget still belongs to the same Discord application and that you did not delete the application that was previously connected to your profile.

### Discord app / Profile Widget is not connected correctly

This bot needs two separate Discord pieces to work:

1. A Discord bot token in `.env`
2. Your Discord application/profile widget connected to your Discord account

The `.env` bot token lets the bot log in and send widget update requests.

The Discord app/profile widget authorization is what allows the application widget to appear and be connected to your Discord profile.

These are not the same thing.

### Important: use `response_type=token`, not `response_type=code`

For this Profile Widget / Social SDK authorization flow, the OAuth2 URL should use:

```txt
response_type=token
```

not:

```txt
response_type=code
```

If your authorization URL uses `response_type=code`, Discord redirects you back with something like:

```txt
?code=....
```

That is the normal OAuth2 authorization code flow, but it is not the flow that fixed the Profile Widget authorization problem for this bot.

Use an authorization URL like this:

```txt
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&response_type=token&redirect_uri=https%3A%2F%2Fdiscord.com&scope=openid%20sdk.social_layer
```

Replace:

```txt
YOUR_APPLICATION_ID
```

with your Discord application ID.

After authorizing, Discord should redirect to a URL that contains something like:

```txt
#access_token=...
```

That means the token flow worked.

DO NOT share that URL or token with anyone.

Discord OAuth2 supports both authorization code grant and implicit grant. The implicit grant uses `response_type=token` and returns an `access_token` in the URL fragment after authorization. That token is sensitive, short-lived, and should be treated like a password.

### Required scopes

For this widget authorization flow, the important scopes are:

```txt
openid sdk.social_layer
```

If you get:

```txt
Missing required OAuth2 scope
```

or:

```txt
code: 50026
```

then your Discord app probably was not authorized with the required Social SDK / Profile Widget scopes.

Try authorizing again with:

```txt
scope=openid%20sdk.social_layer
```

Discord’s Social SDK documentation lists `openid` and `sdk.social_layer` as the default communication scopes for Social SDK features.

### Make sure the redirect URI is added

If the authorization link does not work, open the Discord Developer Portal and check your application’s OAuth2 settings.

Add this redirect URI:

```txt
https://discord.com
```

Then try the authorization URL again.

### Bot token vs OAuth token

Do not confuse these:

| Token | Where it is used | Should it go in `.env`? |
|---|---|---|
| Discord bot token | Lets `sync.js` log in as the bot | Yes, as `DISCORD_BOT_TOKEN` |
| OAuth access token from the URL | Used by Discord authorization flow | No |
| Discord user/account token | Your personal Discord account token | Never use this |

Never put your personal Discord user token into this project.

Never paste your Discord token, cookies, or OAuth access token into public chats, GitHub, screenshots, or issues.

### `401 Unauthorized` or `code: 40001`

If widget updates fail with:

```txt
401 Unauthorized
```

or:

```txt
{"message":"Unauthorized","code":40001}
```

check these first:

- `DISCORD_BOT_TOKEN` is correct
- `APPLICATION_ID` is correct
- `DISCORD_USER_ID` is your numeric Discord user ID
- The widget belongs to the same Discord application ID used in `.env`
- The app was authorized using the correct OAuth2 URL
- You did not delete the Discord application that was connected to your profile widget

If you deleted the Discord application that was already connected to your profile widget, the old widget connection can become broken.

In that case:

1. Remove the broken widget from your Discord profile.
2. Re-authorize the new/current Discord application.
3. Make sure your `.env` uses the new/current `APPLICATION_ID`.
4. Restart the bot.
5. Run:

```txt
/syncanime
/refresh
```

### Slash commands work, but widget does not update

If slash commands appear but the widget does not update, the bot is probably logging in correctly, but the Discord app/profile widget connection is broken.

Try this order:

1. Stop the bot.
2. Check `.env`.
3. Re-authorize the app with the `response_type=token` URL.
4. Make sure the widget layout uses the correct dynamic variable names.
5. Start the bot again.
6. Run:

```txt
/syncanime
/refresh
```

### I authorized the wrong app

If you have multiple Discord Developer Applications, make sure everything uses the same one:

- The app you authorized
- The app that owns the Profile Widget layout
- The `APPLICATION_ID` in `.env`
- The bot token from that same application

If even one of these comes from a different app, the widget may not update.

### Missing required environment variables

Make sure `.env` exists and contains:

```env
DISCORD_BOT_TOKEN=
APPLICATION_ID=
DISCORD_USER_ID=
```

Also make sure the file is named exactly:

```txt
.env
```

not:

```txt
.env.txt
```

### Slash commands do not appear

Try:

- Restarting the bot
- Restarting Discord
- Checking that the bot logged in successfully
- Checking that `APPLICATION_ID` is correct
- Making sure the Discord application is installed correctly

### Bot says only the owner can use commands

The bot only accepts commands from the user ID in `.env`.

Check:

```env
DISCORD_USER_ID=
```

Make sure it is your numeric Discord user ID.

### Widget does not update

Try:

```txt
/syncanime
/refresh
```

Also check that your Discord widget layout uses the correct dynamic variable names.

### Mean score shows `TBA`

This is normal if AniList has no score yet.

This often happens when:

- The anime has not aired yet
- Not enough users have scored it
- AniList has not updated the score yet

### Countdown is wrong

Check your `firstEpisodeAt`.

Make sure it uses ISO format with timezone offset.

Example for WITA:

```txt
2026-07-07T20:30:00+08:00
```

### Automatic updates stopped

The bot may stop automatic updates after repeated errors or Discord authorization failures.

Check `state.json` for:

```json
"periodicUpdatesDisabled": true
```

Fix the issue, then restart the bot.

### Discord returns unauthorized errors

Check:

- Your bot token is correct
- Your application ID is correct
- Your Discord user ID is correct
- Your widget is still connected to the correct Discord application
- Your Discord application has the required widget/Profile Widget access

## Security Notes

Never upload these files:

```txt
.env
config.json
state.json
node_modules/
```

If you accidentally upload your `.env`, reset your Discord bot token immediately.

Never share:

* Discord bot tokens
* Discord user tokens
* OAuth access tokens
* Discord cookies
* Redirected authorization URLs containing `#access_token=`

## Widget Preset Showcase

## Credits

This project was inspired by and partially adapted from:

```txt
Ani-List-Widget
https://github.com/100000000000000000001/Ani-List-Widget
```

The original project is licensed under the MIT Licence.

## Licence

This project is licensed under the MIT Licence.

See the `LICENCE` file for details.