# Anime Countdown Discord Widget

A Discord Profile Widget bot for airing anime. It shows:

- Anime title from AniList, with optional manual override
- Current aired episode count
- Next episode number
- Local countdown to next episode
- AniList mean score

## Setup

1. Copy `.env.example` to `.env` and fill your Discord values.
2. Copy `config.example.json` to `config.json` and edit your anime setup.
3. Run:

```bash
npm install
node sync.js
```

## Widget dynamic variable names

Your Discord widget layout should use these dynamic names:

Text:
- `anime_title`
- `episode_count`
- `current_episode`
- `total_episodes`
- `next_episode`
- `countdown`
- `mean_score`
- `airing_time`
- `airing_status`
- `last_sync`

Images:
- `cover_image`
- `banner_image`

Numbers:
- `current_episode_num`
- `total_episodes_num`
- `next_episode_num`
- `mean_score_num`
- `progress_percent`

## Commands

- `/setanime` - set AniList ID and first episode time
- `/syncanime` - manually sync title, score, total episodes, and next airing from AniList
- `/refresh` - push current locally calculated widget data to Discord
- `/settitle` - set a manual title override
- `/cleartitle` - remove manual title override
- `/setnext` - add/manual override an episode airing time
- `/clearoverrides` - clear all manual episode overrides
- `/status` - show current calculated state

## Schedule priority

Manual episode override > AniList next airing data > local weekly prediction.

Mean score syncs on startup, manual `/syncanime`, and after a new episode release delay window.




## Config notes

Copy `config.example.json` to `config.json`.

Only a few values usually need manual editing:

- `firstEpisodeAt` — the first episode release date/time. This is used for local countdown calculation.
- `updateIntervalMinutes` — how often the widget countdown is refreshed. Recommended: 10 or 15 minutes.
- `postReleaseAniListSyncDelayMinutes` — how long the bot waits after an episode airs before syncing AniList again.
- `manualOverrides` — optional manual fixes for delays or skipped weeks.

Most anime metadata can be changed through Discord slash commands instead:

- `/setanime` changes the AniList anime.
- `/settitle` overrides the displayed title.
- `/cleartitle` returns to the AniList title.
- `/syncanime` refreshes AniList title, score, episodes, and airing schedule.
- `/setnext` manually overrides the next episode airing date.
- `/clearoverrides` removes manual schedule overrides.


## State file

The bot automatically creates and updates `state.json`.

This file stores cached AniList data, last sync times, widget update status, and error/failsafe information. You usually do not need to edit it manually.

Do not commit your real `state.json` to GitHub. Use `state.example.json` as the template instead.







## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Credits

This project was inspired by and partially adapted from [Ani-List-Widget](https://github.com/100000000000000000001/Ani-List-Widget), which is licensed under the MIT License.