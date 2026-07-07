require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const ANILIST_API_URL = 'https://graphql.anilist.co';
const DISCORD_API_BASE_URL = 'https://discord.com/api/v9';
const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

const MIN_UPDATE_INTERVAL_MINUTES = 10;
const DEFAULT_UPDATE_INTERVAL_MINUTES = 60;

let periodicUpdatesDisabled = false;
let consecutivePeriodicFailures = 0;
let nextPeriodicAttemptAt = 0;

const env = {
  discordBotToken: process.env.DISCORD_BOT_TOKEN?.trim(),
  applicationId: process.env.APPLICATION_ID?.trim(),
  discordUserId: (process.env.DISCORD_USER_ID || '').replace(/\D/g, ''),
};

function validateEnv() {
  const missing = [];
  if (!env.discordBotToken) missing.push('DISCORD_BOT_TOKEN');
  if (!env.applicationId) missing.push('APPLICATION_ID');
  if (!env.discordUserId) missing.push('DISCORD_USER_ID');
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

function defaultConfig() {
  return {
    animeId: 123456,
    titlePreference: 'romaji',
    manualTitle: null,
    firstEpisodeAt: '2026-07-10T00:30:00+09:00',
    intervalDays: 7,
    totalEpisodesOverride: null,
    updateIntervalMinutes: 60,
    postReleaseAniListSyncDelayMinutes: 45,
    manualOverrides: [],
  };
}

function defaultState() {
  return {
    anilist: null,
    lastAniListSync: null,
    lastPostReleaseSyncEpisode: null,
    lastWidgetPush: null,
  };
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback();
  try {
    return { ...fallback(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    console.error(`Failed to read ${path.basename(filePath)}: ${error.message}`);
    return fallback();
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadConfig() {
  const config = loadJson(CONFIG_PATH, defaultConfig);
  config.manualOverrides = Array.isArray(config.manualOverrides) ? config.manualOverrides : [];
  return config;
}

function saveConfig(config) {
  saveJson(CONFIG_PATH, config);
}

function loadState() {
  return loadJson(STATE_PATH, defaultState);
}

function saveState(state) {
  saveJson(STATE_PATH, state);
}

function assertValidDate(dateString, fieldName = 'date') {
  const time = Date.parse(dateString);
  if (Number.isNaN(time)) {
    throw new Error(`${fieldName} is invalid. Use ISO format, example: 2026-07-10T00:30:00+09:00`);
  }
  return time;
}

function clampInt(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pickTitle(media, preference = 'romaji', manualTitle = null) {
  if (manualTitle && manualTitle.trim()) return manualTitle.trim();
  const title = media?.title || {};

  if (preference === 'english') return title.english || title.romaji || title.native || `Anime #${media?.id ?? 'Unknown'}`;
  if (preference === 'native') return title.native || title.romaji || title.english || `Anime #${media?.id ?? 'Unknown'}`;
  return title.romaji || title.english || title.native || `Anime #${media?.id ?? 'Unknown'}`;
}

async function aniListRequest(query, variables = {}) {
  const response = await axios.post(
    ANILIST_API_URL,
    { query, variables },
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  );

  if (response.data?.errors?.length) {
    throw new Error(JSON.stringify(response.data.errors));
  }
  return response.data?.data;
}

async function fetchAniListAnime(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        episodes
        meanScore
        averageScore
        status
        coverImage { large extraLarge }
        bannerImage
        nextAiringEpisode {
          episode
          airingAt
          timeUntilAiring
        }
      }
    }
  `;

  const data = await aniListRequest(query, { id: Number(animeId) });
  if (!data?.Media) throw new Error(`AniList anime ID ${animeId} was not found.`);
  return data.Media;
}

function formatAniListSearchChoice(media) {
  const title = media.title?.romaji || media.title?.english || media.title?.native || `Anime #${media.id}`;
  const year = media.startDate?.year ? ` (${media.startDate.year})` : '';
  const extra = media.format ? ` · ${media.format}` : '';
  return `${title}${year}${extra}`.slice(0, 100);
}

async function searchAniListAnime(search) {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          startDate { year }
          format
          status
        }
      }
    }
  `;

  const data = await aniListRequest(query, { search });
  return data?.Page?.media || [];
}

async function resolveAniListAnimeInput(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    throw new Error('Anime input is empty.');
  }

  // If user pasted an AniList ID
  if (/^\d+$/.test(raw)) {
    return fetchAniListAnime(Number(raw));
  }

  // If user typed a name manually
  const results = await searchAniListAnime(raw);
  if (!results.length) {
    throw new Error(`No AniList anime found for "${raw}". Try using the AniList ID instead.`);
  }

  return fetchAniListAnime(results[0].id);
}

function toIsoFromUnixSeconds(seconds) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function syncAniList({ reason = 'manual' } = {}) {
  const config = loadConfig();
  const state = loadState();

  if (!config.animeId || Number(config.animeId) === 123456) {
    throw new Error('Set your real AniList anime ID first with /setanime or config.json.');
  }

  const media = await fetchAniListAnime(config.animeId);
  const next = media.nextAiringEpisode || null;

  state.anilist = {
    id: media.id,
    title: media.title,
    displayTitle: pickTitle(media, config.titlePreference, config.manualTitle),
    episodes: clampInt(config.totalEpisodesOverride, null) ?? clampInt(media.episodes, null),
    meanScore: clampInt(media.meanScore, null) ?? clampInt(media.averageScore, null),
    status: media.status || null,
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
    bannerImage: media.bannerImage || null,
    nextAiringEpisode: next
      ? {
          episode: clampInt(next.episode, null),
          airingAt: toIsoFromUnixSeconds(next.airingAt),
          timeUntilAiring: clampInt(next.timeUntilAiring, null),
        }
      : null,
  };

  state.lastAniListSync = new Date().toISOString();
  state.lastAniListSyncReason = reason;
  saveState(state);
  return state.anilist;
}

function getManualOverrideForEpisode(config, episode) {
  return config.manualOverrides.find(item => Number(item.episode) === Number(episode)) || null;
}

function localAiringAtMs(config, episode) {
  const override = getManualOverrideForEpisode(config, episode);
  if (override?.airingAt) return assertValidDate(override.airingAt, `manual override for episode ${episode}`);

  const firstMs = assertValidDate(config.firstEpisodeAt, 'firstEpisodeAt');
  const intervalMs = Number(config.intervalDays || 7) * 24 * 60 * 60 * 1000;
  return firstMs + (Number(episode) - 1) * intervalMs;
}

function computeLocalSchedule(config, totalEpisodes, nowMs = Date.now()) {
  const maxEpisode = totalEpisodes || 500;

  for (let ep = 1; ep <= maxEpisode; ep++) {
    const atMs = localAiringAtMs(config, ep);
    if (nowMs < atMs) {
      return {
        currentEpisode: Math.max(0, ep - 1),
        nextEpisode: ep,
        nextAiringAtMs: atMs,
        source: getManualOverrideForEpisode(config, ep) ? 'manual' : 'local',
      };
    }
  }

  return {
    currentEpisode: totalEpisodes || maxEpisode,
    nextEpisode: null,
    nextAiringAtMs: null,
    source: 'finished',
  };
}

function computeDisplayState() {
  const config = loadConfig();
  const state = loadState();
  const anilist = state.anilist || {};
  const totalEpisodes = clampInt(config.totalEpisodesOverride, null) ?? clampInt(anilist.episodes, null);
  const nowMs = Date.now();

  let schedule = computeLocalSchedule(config, totalEpisodes, nowMs);

  const anilistNext = anilist.nextAiringEpisode;
  if (anilistNext?.episode && anilistNext?.airingAt) {
    const anilistAtMs = Date.parse(anilistNext.airingAt);
    const override = getManualOverrideForEpisode(config, anilistNext.episode);

    // Use AniList only for future episodes and only if there is no manual override for that episode.
    if (!override && Number.isFinite(anilistAtMs) && anilistAtMs > nowMs) {
      schedule = {
        currentEpisode: Math.max(0, Number(anilistNext.episode) - 1),
        nextEpisode: Number(anilistNext.episode),
        nextAiringAtMs: anilistAtMs,
        source: 'anilist',
      };
    }
  }

  const title = config.manualTitle?.trim() || anilist.displayTitle || `Anime #${config.animeId}`;
  const meanScore = clampInt(anilist.meanScore, null);
  const progressPercent = totalEpisodes
    ? Math.min(100, Math.round((schedule.currentEpisode / totalEpisodes) * 100))
    : null;

  return {
    config,
    state,
    title,
    totalEpisodes,
    currentEpisode: schedule.currentEpisode,
    nextEpisode: schedule.nextEpisode,
    nextAiringAtMs: schedule.nextAiringAtMs,
    scheduleSource: schedule.source,
    meanScore,
    coverImage: anilist.coverImage || null,
    bannerImage: anilist.bannerImage || null,
    lastAniListSync: state.lastAniListSync || null,
    progressPercent,
  };
}

function formatCountdown(targetMs, nowMs = Date.now()) {
  if (!targetMs) return 'Finished';
  let remaining = Math.max(0, targetMs - nowMs);

  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  const days = Math.floor(remaining / day);
  remaining %= day;
  const hours = Math.floor(remaining / hour);
  remaining %= hour;
  const minutes = Math.floor(remaining / minute);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatEpisodeCount(current, total) {
  return total ? `Episode ${current} / ${total}` : `Episode ${current}`;
}

function formatNextEpisode(nextEpisode) {
  return nextEpisode ? `Episode ${nextEpisode}` : 'Finished';
}

function formatMeanScore(score) {
  const n = Number(score);

  if (!Number.isFinite(n) || n <= 0) {
    return 'TBA';
  }

  return `${n}%`;
}

function formatAiringTime(targetMs) {
  if (!targetMs) return 'No upcoming episode';
  return new Date(targetMs).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatNextAiringDate(targetMs) {
  if (!targetMs) return 'No upcoming episode';
  return new Date(targetMs).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function buildWidgetPayload(display) {
  const countdown = formatCountdown(display.nextAiringAtMs);
  const episodeCount = formatEpisodeCount(display.currentEpisode, display.totalEpisodes);
  const meanScoreText = formatMeanScore(display.meanScore);
  const airingTime = formatAiringTime(display.nextAiringAtMs);
  const nextAiringDate = formatNextAiringDate(display.nextAiringAtMs);
  const lastSyncText = display.lastAniListSync ? new Date(display.lastAniListSync).toLocaleString() : 'Never';

  const dynamic = [
    { type: 1, name: 'anime_title', value: display.title },
    { type: 1, name: 'episode_count', value: episodeCount },
    { type: 1, name: 'current_episode', value: String(display.currentEpisode) },
    { type: 1, name: 'total_episodes', value: display.totalEpisodes ? String(display.totalEpisodes) : '?' },
    { type: 1, name: 'next_episode', value: formatNextEpisode(display.nextEpisode) },
    { type: 1, name: 'countdown', value: countdown },
    { type: 1, name: 'mean_score', value: meanScoreText },
    { type: 1, name: 'airing_time', value: airingTime },
    { type: 1, name: 'next_airing_date', value: nextAiringDate },
    { type: 1, name: 'airing_status', value: `Source: ${display.scheduleSource}` },
    { type: 1, name: 'last_sync', value: lastSyncText },
    { type: 2, name: 'current_episode_num', value: String(display.currentEpisode) },
    { type: 2, name: 'total_episodes_num', value: String(display.totalEpisodes || 0) },
    { type: 2, name: 'next_episode_num', value: String(display.nextEpisode || 0) },
    { type: 2, name: 'mean_score_num', value: String(display.meanScore || 0) },
    { type: 2, name: 'progress_percent', value: String(display.progressPercent || 0) },
  ];

  if (display.coverImage) {
    dynamic.push({ type: 3, name: 'cover_image', value: { url: display.coverImage } });
  }
  if (display.bannerImage) {
    dynamic.push({ type: 3, name: 'banner_image', value: { url: display.bannerImage } });
  }

  return {
    username: display.title,
    data: { dynamic },
  };
}

function hashPayload(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function getApiErrorInfo(error) {
  const status = error.response?.status ?? null;
  const data = error.response?.data ?? null;
  const code = data?.code ?? null;
  const message = data?.message || error.message || 'Unknown error';

  const retryAfterFromBody = Number(data?.retry_after);
  const retryAfterFromHeader = Number(error.response?.headers?.['retry-after']);
  const resetAfterFromHeader = Number(error.response?.headers?.['x-ratelimit-reset-after']);

  const retryAfterSeconds =
    Number.isFinite(retryAfterFromBody) ? retryAfterFromBody :
    Number.isFinite(retryAfterFromHeader) ? retryAfterFromHeader :
    Number.isFinite(resetAfterFromHeader) ? resetAfterFromHeader :
    null;

  return {
    status,
    code,
    message,
    retryAfterSeconds,
    raw: data ? JSON.stringify(data) : message,
  };
}

function isFatalDiscordWidgetError(info) {
  return (
    info.status === 401 ||
    info.status === 403 ||
    info.code === 40001 ||
    info.code === 50026
  );
}

function saveDiscordErrorToState(info, action) {
  const state = loadState();
  state.lastDiscordError = {
    action,
    at: new Date().toISOString(),
    status: info.status,
    code: info.code,
    message: info.message,
  };
  saveState(state);
}

async function pushWidget({ force = false } = {}) {
  const display = computeDisplayState();
  const payload = buildWidgetPayload(display);
  const payloadHash = hashPayload(payload);

  const stateBefore = loadState();

  if (!force && stateBefore.lastWidgetPayloadHash === payloadHash) {
    stateBefore.lastWidgetSkip = new Date().toISOString();
    stateBefore.lastWidgetSkipReason = 'payload unchanged';
    saveState(stateBefore);
    return display;
  }

  await axios.patch(
    `${DISCORD_API_BASE_URL}/applications/${env.applicationId}/users/${env.discordUserId}/identities/0/profile`,
    payload,
    {
      headers: {
        Authorization: `Bot ${env.discordBotToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const state = loadState();
  state.lastWidgetPush = new Date().toISOString();
  state.lastWidgetPayloadHash = payloadHash;
  state.lastDiscordError = null;
  saveState(state);

  return display;
}

async function maybeSyncAfterEpisodeRelease() {
  const display = computeDisplayState();
  if (!display.nextAiringAtMs || !display.nextEpisode) return false;

  const releaseEpisode = display.nextEpisode;
  const delayMs = Number(display.config.postReleaseAniListSyncDelayMinutes || 45) * 60 * 1000;
  const releasePlusDelay = display.nextAiringAtMs + delayMs;

  if (Date.now() < releasePlusDelay) return false;

  const state = loadState();
  if (Number(state.lastPostReleaseSyncEpisode) === Number(releaseEpisode)) return false;

  console.log(`Episode ${releaseEpisode} should be released. Syncing AniList after delay window...`);
  await syncAniList({ reason: `post-release episode ${releaseEpisode}` });

  const newState = loadState();
  newState.lastPostReleaseSyncEpisode = releaseEpisode;
  saveState(newState);
  return true;
}

async function periodicUpdate() {
  if (periodicUpdatesDisabled) {
    return;
  }

  if (Date.now() < nextPeriodicAttemptAt) {
    return;
  }

  try {
    await maybeSyncAfterEpisodeRelease();
    const display = await pushWidget();

    consecutivePeriodicFailures = 0;
    nextPeriodicAttemptAt = 0;

    console.log(
      `[${new Date().toISOString()}] Widget updated: ` +
      `${display.title} | ` +
      `${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)} | ` +
      `Next ${display.nextEpisode || 'none'} in ${formatCountdown(display.nextAiringAtMs)}`
    );
  } catch (error) {
    const info = getApiErrorInfo(error);

    console.error('Periodic update failed:', info.raw);
    saveDiscordErrorToState(info, 'periodicUpdate');

    if (isFatalDiscordWidgetError(info)) {
      periodicUpdatesDisabled = true;

      const state = loadState();
      state.periodicUpdatesDisabled = true;
      state.periodicUpdatesDisabledAt = new Date().toISOString();
      state.periodicUpdatesDisabledReason =
        `${info.status || ''} ${info.code || ''} ${info.message}`.trim();
      saveState(state);

      console.error(
        'Automatic widget updates have been DISABLED because Discord returned an auth/scope error.\n' +
        'Fix the bot token, app ownership, OAuth2 scopes, or widget authorization, then restart the bot.'
      );

      return;
    }

    if (info.status === 429) {
      const waitMs = Math.ceil((info.retryAfterSeconds || 60) * 1000) + 5000;
      nextPeriodicAttemptAt = Date.now() + waitMs;

      console.warn(
        `Rate limited by Discord. Waiting about ${Math.ceil(waitMs / 1000)} seconds before trying again.`
      );

      return;
    }

    consecutivePeriodicFailures += 1;

    const backoffMinutes = Math.min(60, 5 * Math.pow(2, consecutivePeriodicFailures - 1));
    nextPeriodicAttemptAt = Date.now() + backoffMinutes * 60 * 1000;

    console.warn(
      `Temporary failure #${consecutivePeriodicFailures}. ` +
      `Backing off for ${backoffMinutes} minute(s).`
    );

    if (consecutivePeriodicFailures >= 5) {
      periodicUpdatesDisabled = true;

      const state = loadState();
      state.periodicUpdatesDisabled = true;
      state.periodicUpdatesDisabledAt = new Date().toISOString();
      state.periodicUpdatesDisabledReason =
        `Too many repeated temporary failures. Last error: ${info.message}`;
      saveState(state);

      console.error(
        'Automatic widget updates have been DISABLED after 5 repeated failures.\n' +
        'Check your internet, Discord API response, bot token, and config, then restart the bot.'
      );
    }
  }
}

function ownerOnly(interaction) {
  return interaction.user.id === env.discordUserId;
}

function createCommands() {
  return [
    new SlashCommandBuilder()
      .setName('setanime')
      .setDescription('Set the airing anime configuration')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2])
      .addStringOption(opt => opt
        .setName('anime')
        .setDescription('Start typing an anime name, or paste an AniList ID')
        .setRequired(true)
        .setAutocomplete(true))
      .addStringOption(opt => opt
        .setName('first_episode')
        .setDescription('First episode ISO time, example: 2026-07-10T00:30:00+09:00')
        .setRequired(true))
      .addIntegerOption(opt => opt
        .setName('total_episodes')
        .setDescription('Total episodes, optional. Leave empty to use AniList if available.')
        .setRequired(false))
      .addNumberOption(opt => opt
        .setName('interval_days')
        .setDescription('Episode interval in days. Default: 7')
        .setRequired(false))
      .addStringOption(opt => opt
        .setName('title_preference')
        .setDescription('Which AniList title style to use')
        .setRequired(false)
        .addChoices(
          { name: 'Romaji', value: 'romaji' },
          { name: 'English', value: 'english' },
          { name: 'Native', value: 'native' },
        )),

    new SlashCommandBuilder()
      .setName('syncanime')
      .setDescription('Sync title, mean score, total episodes, and next airing from AniList')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2]),

    new SlashCommandBuilder()
      .setName('refresh')
      .setDescription('Push the current locally calculated widget data to Discord')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2]),

    new SlashCommandBuilder()
      .setName('settitle')
      .setDescription('Set a manual title override')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2])
      .addStringOption(opt => opt
        .setName('title')
        .setDescription('Manual title to display')
        .setRequired(true)),

    new SlashCommandBuilder()
      .setName('cleartitle')
      .setDescription('Remove manual title override and use AniList title again')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2]),

    new SlashCommandBuilder()
      .setName('setnext')
      .setDescription('Manually override an episode airing time')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2])
      .addIntegerOption(opt => opt
        .setName('episode')
        .setDescription('Episode number')
        .setRequired(true))
      .addStringOption(opt => opt
        .setName('airing_at')
        .setDescription('ISO time, example: 2026-08-07T00:30:00+09:00')
        .setRequired(true))
      .addStringOption(opt => opt
        .setName('reason')
        .setDescription('Optional reason, example: delayed one week')
        .setRequired(false)),

    new SlashCommandBuilder()
      .setName('clearoverrides')
      .setDescription('Clear all manual episode airing overrides')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2]),

    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Show the currently calculated anime widget state')
      .setIntegrationTypes([1])
      .setContexts([0, 1, 2]),
  ].map(cmd => cmd.toJSON());
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
  console.log(`Widget bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    try {
      if (interaction.commandName !== 'setanime') return;

      const focused = interaction.options.getFocused(true);
      if (focused.name !== 'anime') return;

      const value = String(focused.value || '').trim();

      if (!value) {
        await interaction.respond([]);
        return;
      }

      // If user types a number, allow using it directly as an AniList ID.
      if (/^\d+$/.test(value)) {
        await interaction.respond([
          {
            name: `Use AniList ID: ${value}`,
            value,
          },
        ]);
        return;
      }

      if (value.length < 2) {
        await interaction.respond([]);
        return;
      }

      const results = await searchAniListAnime(value);

      await interaction.respond(
        results.slice(0, 10).map(media => ({
          name: formatAniListSearchChoice(media),
          value: String(media.id),
        }))
      );
    } catch (error) {
      await interaction.respond([]).catch(() => {});
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (!ownerOnly(interaction)) {
    await interaction.reply({ content: 'This bot only accepts commands from its owner.', ephemeral: true });
    return;
  }

  try {
    if (interaction.commandName === 'setanime') {
      await interaction.deferReply({ ephemeral: true });

      const config = loadConfig();
      const animeInput = interaction.options.getString('anime');
      const firstEpisode = interaction.options.getString('first_episode');
      const totalEpisodes = interaction.options.getInteger('total_episodes');
      const intervalDays = interaction.options.getNumber('interval_days');
      const titlePreference = interaction.options.getString('title_preference');

      assertValidDate(firstEpisode, 'first_episode');

      const selectedAnime = await resolveAniListAnimeInput(animeInput);
      
      const previousAnimeId = Number(config.animeId);

      config.animeId = selectedAnime.id;
      config.firstEpisodeAt = firstEpisode;

      if (previousAnimeId !== Number(selectedAnime.id)) {
        config.manualTitle = null;
        config.manualOverrides = [];
        config.totalEpisodesOverride = null;
      }

      config.totalEpisodesOverride = totalEpisodes != null ? totalEpisodes : config.totalEpisodesOverride;
      config.intervalDays = intervalDays != null ? intervalDays : 7;
      if (titlePreference) config.titlePreference = titlePreference;

      saveConfig(config);

      const media = await syncAniList({ reason: 'setanime' });
      const display = await pushWidget();

      await interaction.editReply(
        `Anime set to **${media.displayTitle}** (#${media.id}).\n` +
        `Widget refreshed: ${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)}, next ${formatNextEpisode(display.nextEpisode)} in ${formatCountdown(display.nextAiringAtMs)}.`
      );
      return;
    }

    if (interaction.commandName === 'syncanime') {
      await interaction.deferReply({ ephemeral: true });
      const media = await syncAniList({ reason: 'manual command' });
      const display = await pushWidget();
      await interaction.editReply(
        `Synced **${media.displayTitle}**. Mean score: ${formatMeanScore(media.meanScore)}.\n` +
        `Widget refreshed: ${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)}, next ${formatNextEpisode(display.nextEpisode)} in ${formatCountdown(display.nextAiringAtMs)}.`
      );
      return;
    }

    if (interaction.commandName === 'refresh') {
      await interaction.deferReply({ ephemeral: true });
      const display = await pushWidget();
      await interaction.editReply(
        `Widget refreshed.\n` +
        `**${display.title}**\n` +
        `${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)}\n` +
        `Next: ${formatNextEpisode(display.nextEpisode)} in ${formatCountdown(display.nextAiringAtMs)}\n` +
        `Mean score: ${formatMeanScore(display.meanScore)}`
      );
      return;
    }

    if (interaction.commandName === 'settitle') {
      await interaction.deferReply({ ephemeral: true });
      const config = loadConfig();
      config.manualTitle = interaction.options.getString('title');
      saveConfig(config);
      await syncAniList({ reason: 'manual title update' }).catch(() => null);
      await pushWidget();
      await interaction.editReply(`Manual title set to **${config.manualTitle}** and widget refreshed.`);
      return;
    }

    if (interaction.commandName === 'cleartitle') {
      await interaction.deferReply({ ephemeral: true });
      const config = loadConfig();
      config.manualTitle = null;
      saveConfig(config);
      await syncAniList({ reason: 'clear title override' });
      const display = await pushWidget();
      await interaction.editReply(`Manual title cleared. Now using **${display.title}**.`);
      return;
    }

    if (interaction.commandName === 'setnext') {
      await interaction.deferReply({ ephemeral: true });
      const config = loadConfig();
      const episode = interaction.options.getInteger('episode');
      const airingAt = interaction.options.getString('airing_at');
      const reason = interaction.options.getString('reason') || 'manual override';
      assertValidDate(airingAt, 'airing_at');

      config.manualOverrides = config.manualOverrides.filter(item => Number(item.episode) !== Number(episode));
      config.manualOverrides.push({ episode, airingAt, reason });
      config.manualOverrides.sort((a, b) => Number(a.episode) - Number(b.episode));
      saveConfig(config);

      const display = await pushWidget();
      await interaction.editReply(
        `Override saved for episode ${episode}: ${airingAt}.\n` +
        `Widget refreshed: ${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)}, next ${formatNextEpisode(display.nextEpisode)} in ${formatCountdown(display.nextAiringAtMs)}.`
      );
      return;
    }

    if (interaction.commandName === 'clearoverrides') {
      await interaction.deferReply({ ephemeral: true });
      const config = loadConfig();
      config.manualOverrides = [];
      saveConfig(config);
      const display = await pushWidget();
      await interaction.editReply(
        `All manual overrides cleared. Widget refreshed: next ${formatNextEpisode(display.nextEpisode)} in ${formatCountdown(display.nextAiringAtMs)}.`
      );
      return;
    }

    if (interaction.commandName === 'status') {
      const display = computeDisplayState();
      await interaction.reply({
        ephemeral: true,
        content:
          `**${display.title}**\n` +
          `${formatEpisodeCount(display.currentEpisode, display.totalEpisodes)}\n` +
          `Next: ${formatNextEpisode(display.nextEpisode)}\n` +
          `Countdown: ${formatCountdown(display.nextAiringAtMs)}\n` +
          `Airing time: ${formatAiringTime(display.nextAiringAtMs)}\n` +
          `Mean score: ${formatMeanScore(display.meanScore)}\n` +
          `Schedule source: ${display.scheduleSource}\n` +
          `Last AniList sync: ${display.lastAniListSync || 'Never'}`,
      });
      return;
    }
  } catch (error) {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`${interaction.commandName} failed:`, details);

    const message = `${interaction.commandName} failed: ${details}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(env.discordBotToken);
  await rest.put(Routes.applicationCommands(env.applicationId), { body: createCommands() });
  console.log('Slash commands registered.');
}

async function main() {
  validateEnv();

  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(defaultConfig());
    console.log('Created config.json. Edit it or use /setanime after the bot starts.');
  }
  if (!fs.existsSync(STATE_PATH)) {
    saveState(defaultState());
    console.log('Created state.json.');
  }

  await registerCommands();
  await client.login(env.discordBotToken);

  try {
    await syncAniList({ reason: 'startup' });
  } catch (error) {
    console.warn(`Startup AniList sync skipped/failed: ${error.message}`);
  }

  await periodicUpdate();

  const config = loadConfig();
  const intervalMinutes = Math.max(
    MIN_UPDATE_INTERVAL_MINUTES,
    Number(config.updateIntervalMinutes || DEFAULT_UPDATE_INTERVAL_MINUTES)
  );

  setInterval(periodicUpdate, intervalMinutes * 60 * 1000);
  console.log(`Periodic widget update interval: ${intervalMinutes} minute(s).`);
}

main().catch(error => {
  console.error('Fatal startup error:', error.response?.data || error.message);
  process.exit(1);
});
