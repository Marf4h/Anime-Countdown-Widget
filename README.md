# Anime Countdown Discord Widget

A lightweight Node.js bot that updates a Discord Profile Widget with airing anime information using public AniList metadata.

It can show the anime title, current aired episode count, next episode number, countdown to the next episode, AniList mean score, cover image, banner image, and episode progress.

## What This Is For?

This project is for users who want to show airing anime countdown data on a Discord Profile Widget. It is not a normal Discord status/Rich Presence bot.

## Features

* Uses public AniList anime metadata
* No AniList login or AniList API key required
* Supports anime search/autocomplete through `/setanime`
* Supports AniList anime IDs
* Shows current aired episode count
* Shows next episode countdown
* Shows AniList mean score, or `TBA` if unavailable
* Supports AniList cover and banner images
* Supports manual episode airing overrides for delays
* Syncs AniList data on startup, command use, and after episode release
* Uses local countdown calculation to avoid unnecessary AniList API requests
* Includes basic rate-limit and failure protection

## Requirements

Before using this project, make sure you have:

* Node.js 18 or newer
* npm
* A Discord Developer Application
* A Discord bot token
* Discord Profile Widget / Social SDK access
* An AniList anime title or AniList anime ID

AniList login is not required.
This bot only reads public anime metadata from AniList.

## Project Structure

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

Files that should stay private and should not be uploaded anywhere:

```txt
.env
config.json
state.json
node_modules/
```

## Quick Start
#### > This assumes you already completed the Discord Profile Widget setup.<br> > [Discord Widget Setup Guide](docs/DISCORD_WIDGET_SETUP.md) For the Full Guide

Clone the repository:

```bash
git clone https://github.com/Marf4h/Anime-Countdown-Widget.git
cd Anime-Countdown-Widget
```

Install dependencies:

```bash
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
copy .env.example .env
```

Create your config file:

```bash
cp config.example.json config.json
```

On Windows PowerShell:

```powershell
copy config.example.json config.json
```

Start the bot:

```bash
npm start
```

Or:

```bash
node sync.js
```

After the bot is running, use `/setanime` in Discord to configure your anime.

## Setup & Installation

This project requires Discord Social SDK / Profile Widget authorization.

The full Discord setup is longer than the normal bot setup, so it is separated into its own guide:

[Discord Widget Setup Guide](docs/DISCORD_WIDGET_SETUP.md)

That guide covers:

* Creating a Discord Developer Application
* Creating the bot token
* Getting your Discord user ID
* Enabling Social SDK
* Adding the redirect URI
* Authorizing the app with the correct OAuth2 scopes
* Installing the app to your Discord account
* Importing the included widget layout
* Making sure everything uses the same Discord application

## Configuration

### `.env`

Your `.env` file should contain:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
APPLICATION_ID=your_discord_application_id
DISCORD_USER_ID=your_discord_user_id
```

| Variable            | Required | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `DISCORD_BOT_TOKEN` | Yes      | Your Discord bot token                |
| `APPLICATION_ID`    | Yes      | Your Discord Developer Application ID |
| `DISCORD_USER_ID`   | Yes      | Your numeric Discord user ID          |

The bot only accepts slash commands from the Discord user ID in `DISCORD_USER_ID`.

Never share your `.env` file.
It contains your Discord bot token.

### `config.json`

The real config file is:

```txt
config.json
```

The public example file is:

```txt
config.example.json
```

Important config fields:

| Field                                | Description                                        |
| ------------------------------------ | -------------------------------------------------- |
| `animeId`                            | AniList anime ID                                   |
| `titlePreference`                    | Title style: `romaji`, `english`, or `native`      |
| `manualTitle`                        | Optional manual title override                     |
| `firstEpisodeAt`                     | First episode airing time                          |
| `intervalDays`                       | Days between episodes                              |
| `totalEpisodesOverride`              | Optional total episode override                    |
| `updateIntervalMinutes`              | How often the Discord widget refreshes             |
| `postReleaseAniListSyncDelayMinutes` | Delay before syncing AniList after an episode airs |
| `manualOverrides`                    | Manual episode airing overrides                    |

Recommended update interval:

```json
10
```

or:

```json
15
```

Do not set it too low.

### `state.json`

The bot automatically creates:

```txt
state.json
```

This file stores runtime data such as:

* Cached AniList metadata
* Last AniList sync time
* Last widget push time
* Last skipped widget update
* Discord API error information
* Automatic update failsafe status

You usually do not need to edit this file manually.

Do not upload this file anywhere.

## Setting an Anime

The easiest way to configure the anime is with:

```txt
/setanime
```

You can search by anime title or paste an AniList anime ID.

You also need to provide the first episode airing time.

Example:

```txt
/setanime anime:Kimi ga Shinu first_episode:2026-07-07T20:30:00+08:00 total_episodes:13 title_preference:english
```

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

## Slash Commands

| Command           | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `/setanime`       | Set the anime using AniList search or AniList ID                      |
| `/syncanime`      | Manually sync AniList title, score, episodes, images, and airing data |
| `/refresh`        | Push the current widget data to Discord                               |
| `/settitle`       | Set a manual title override                                           |
| `/cleartitle`     | Remove the manual title override                                      |
| `/setnext`        | Manually override an episode airing time                              |
| `/clearoverrides` | Clear all manual episode overrides                                    |
| `/status`         | Show the currently calculated anime widget state                      |

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

## Discord Widget Dynamic Variables

Use these variable names if you want to edit the preset widget or create your own widget layout.

The bot sends three types of variables:

| Type   | Use for                                                   |
| ------ | --------------------------------------------------------- |
| Text   | Normal readable text, labels, countdowns, and titles      |
| Number | Progress bars, counters, percentages, and numeric widgets |
| Image  | Cover art or banner image slots                           |

### Text Variables

| Variable           | Example                                  | Description                        |
| ------------------ | ---------------------------------------- | ---------------------------------- |
| `anime_title`      | `I Want to Love You Till Your Dying Day` | Anime title                        |
| `episode_count`    | `Episode 3 / 13`                         | Ready-to-use episode progress text |
| `current_episode`  | `3`                                      | Current aired episode as text      |
| `total_episodes`   | `13`                                     | Total episodes as text             |
| `next_episode`     | `Episode 4`                              | Next episode label                 |
| `countdown`        | `4h 20m`                                 | Time until next episode            |
| `mean_score`       | `82%` or `TBA`                           | AniList mean score                 |
| `airing_time`      | `Tue, Jul 7, 08:30 PM GMT+8`             | Full next airing time              |
| `next_airing_date` | `Tue, Jul 7`                             | Short next airing date             |
| `airing_status`    | `Source: anilist`                        | Schedule source                    |
| `last_sync`        | `7/7/2026, 6:12 PM`                      | Last AniList sync time             |

### Image Variables

| Variable       | Description          |
| -------------- | -------------------- |
| `cover_image`  | AniList cover image  |
| `banner_image` | AniList banner image |

### Number Variables

Use these for progress bars, counters, and numeric widget elements.

| Variable              | Example | Description                                         |
| --------------------- | ------: | --------------------------------------------------- |
| `current_episode_num` |     `3` | Current aired episode as a number                   |
| `total_episodes_num`  |    `13` | Total episode count as a number                     |
| `next_episode_num`    |     `4` | Next episode number                                 |
| `mean_score_num`      |    `82` | AniList score as a number. Shows `0` if unavailable |
| `progress_percent`    |    `23` | Episode progress from `0` to `100`                  |

## How Scheduling Works

The bot decides the next episode using this priority:

```txt
Manual episode override > AniList next airing data > Local weekly prediction
```

### Manual episode override

Manual overrides have the highest priority.

Use this when an episode is delayed, skipped, or moved to a different time.

Example:

```txt
/setnext episode:5 airing_at:2026-08-07T20:30:00+08:00 reason:Delayed by one week
```

### AniList next airing data

If AniList has next airing data, the bot can use it.

This helps correct the schedule when AniList knows the official next airing time.

### Local weekly prediction

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

* When the bot starts
* When `/setanime` is used
* When `/syncanime` is used
* After an episode airs and the release delay window passes

The countdown itself is calculated locally and updated on an interval.

This avoids making unnecessary AniList API requests.

## Troubleshooting

### Slash commands do not appear

Try:

* Restarting the bot
* Restarting Discord
* Checking that the bot logged in successfully
* Checking that `APPLICATION_ID` is correct
* Making sure the Discord application is installed correctly

### Bot says only the owner can use commands

The bot only accepts commands from the user ID in `.env`.

Check:

```env
DISCORD_USER_ID=
```

Make sure it is your numeric Discord user ID.

### Bot logs in, but the widget does not update

If slash commands work but the widget does not update, the bot is probably logging in correctly, but the Discord app/profile widget connection is broken.

Check that:

* Social SDK is enabled
* The app was authorized with the correct OAuth2 scopes
* The app was installed using **Add to my Apps**
* The widget layout belongs to the same Discord application
* The dynamic variable names in the widget match the variables sent by the bot

Then try:

```txt
/syncanime
/refresh
```

### Missing required OAuth2 scope or `code: 50026`

If you see:

```txt
Missing required OAuth2 scope
```

or:

```txt
code: 50026
```

reauthorize the app with these scopes:

```txt
openid
sdk.social_layer
```

Make sure you selected:

```txt
sdk.social_layer
```

not:

```txt
sdk.social_layer_presence
```

For this Profile Widget / Social SDK authorization flow, the OAuth2 URL should use:

```txt
response_type=token
```

not:

```txt
response_type=code
```

### `401 Unauthorized` or `code: 40001`

If widget updates fail with:

```txt
401 Unauthorized
```

or:

```json
{"message":"Unauthorized","code":40001}
```

check these first:

* `DISCORD_BOT_TOKEN` is correct
* `APPLICATION_ID` is correct
* `DISCORD_USER_ID` is your numeric Discord user ID
* The widget belongs to the same Discord application ID used in `.env`
* The app was authorized using the correct OAuth2 URL
* You did not delete the Discord application that was connected to your profile widget

If you deleted the Discord application that was already connected to your profile widget:

1. Remove the broken widget from your Discord profile.
2. Re-authorize the new/current Discord application.
3. Make sure your `.env` uses the new/current `APPLICATION_ID`.
4. Restart the bot.
5. Run:

```txt
/syncanime
/refresh
```

### Mean score shows `TBA`

This is normal if AniList has no score yet.

This often happens when:

* The anime has not aired yet
* Not enough users have scored it
* AniList has not updated the score yet

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

The original project is licensed under the MIT License.

## Licence

This project is licensed under the MIT License.

See the `LICENSE` file for details.