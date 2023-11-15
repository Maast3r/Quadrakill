import axios from 'axios';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
} from '@discordjs/voice';
import { join } from 'node:path';

const LEAGUE_GAME_URL = 'https://127.0.0.1:2999/';
const LEAGUE_GAME_EVENTS_ENDPOINT = '/liveclientdata/eventdata';

const DISCORD_SERVER_ID = '134514320578052096';
const DISCORD_CHANNEL_ID = '472224402113560586';
const POLL_RATE = 1_000;

const GAME_EVENTS_TO_AUDIO = {
    // GameStart: './sound-clips/quadraaa-kill.mp3', // for testing
    // MinionsSpawning: './sound-clips/quadraaa-kill.mp3', // for testing
    GameStart: '',
    MinionsSpawning: '',
    FirstBrick: '',
    TurretKilled: '',
    InhibKilled: '',
    DragonKill: '',
    DragonKillStolen: '',
    DragonKillElder: '',
    DragonKillElderStolen: './sound-clips/40IQ.mp3',
    HeraldKill: '',
    HeraldKillStolen: './sound-clips/40IQ.mp3',
    BaronKill: '',
    BaronKillStolen: './sound-clips/40IQ.mp3',
    ChampionKill: '',
    Multikill2: './sound-clips/double-kill.mp3',
    Multikill3: './sound-clips/oh-baby-a-triple.mp3',
    Multikill4: './sound-clips/quadraaa-kill.mp3',
    Multikill5: './sound-clips/penta-kill.mp3',
    Ace: '',
    FirstBlood: './sound-clips/faker-what-was-that.mp3',
};
const ELIGIBLE_PLAYERS = new Set([
    'Mike Cheek',
    'baseballover723',
    'Doomerdinger',
]);

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let channel;
let connection;
let player;
let lastIndexRead = 0;
let isIdle = true;
const audioQueue = [];

axios.defaults.baseURL = LEAGUE_GAME_URL;

const pollLeagueGameClient = async () => {
    const eventData = await axios
        .get(LEAGUE_GAME_EVENTS_ENDPOINT)
        .then((response) => {
            return response.data;
        })
        .catch(() => {
            lastIndexRead = 0; // not in game, reset event counter
        });

    if (eventData?.Events && lastIndexRead < eventData.Events.length) {
        for (
            lastIndexRead;
            lastIndexRead < eventData.Events.length;
            lastIndexRead++
        ) {
            addToAudioQueue(eventData.Events[lastIndexRead]);
        }
    }

    setTimeout(pollLeagueGameClient, POLL_RATE);
};

const getGameEvent = (event) => {
    console.log('get game event');
    // if executed, it will still have the minion/tower's name as the KillerName
    // eg: SRU_Baron killed Mike Cheek
    if (event.EventName === 'DragonKill') {
        const elderString = event.DragonType === 'Elder' ? 'Elder' : '';
        const stolenString = event.Stolen === 'True' ? 'Stolen' : '';
        return `${event.EventName}${elderString}${stolenString}`;
    } else if (
        event.EventName === 'HeraldKill' ||
        event.EventName === 'BaronKill'
    ) {
        const stolenString = event.Stolen === 'True' ? 'Stolen' : '';
        return `${event.EventName}${stolenString}`;
    } else if (event.EventName === 'MultiKill') {
        return `${event.EventName}${event.KillStreak}`;
    } else {
        return event.EventName;
    }
};

const addToAudioQueue = (event) => {
    const gameEvent = getGameEvent(event);
    const audioPath = GAME_EVENTS_TO_AUDIO[gameEvent];
    const isKillEvent = Boolean(event?.KillerName);

    if (
        (!isKillEvent && audioPath) ||
        (isKillEvent && ELIGIBLE_PLAYERS.has(event.KillerName))
    ) {
        const audioResource = createAudioResource(
            join(process.cwd(), audioPath),
            { inlineVolume: true }
        );
        audioResource.volume.setVolume(0.4); // maybe make this configurable per sound file
        audioQueue.push(audioResource);

        if (isIdle) {
            console.log('playing:', audioPath);
            player.play(audioQueue.shift());
        }
    }
};

const joinSketchyCloset = async (client) => {
    channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: DISCORD_SERVER_ID,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    player = createAudioPlayer();
    player.play(createAudioResource(join(process.cwd()), '40IQ.mp3')); // need to start it, idk why
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Playing, () => {
        isIdle = false;
    });

    player.on('error', (error) => {
        console.error(
            `Error: ${error.message} with resource ${error.resource.metadata.title}`
        );
    });

    player.on(AudioPlayerStatus.Idle, () => {
        isIdle = true;

        if (audioQueue.length > 0) {
            player.play(audioQueue.shift());
        }
    });
};

discordClient.once(Events.ClientReady, async (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    await joinSketchyCloset(client);

    client.on('voiceStateUpdate', async () => {
        const hypeBot = channel.members.find((member) => member.user.bot);

        if (channel.members.size <= 1 && hypeBot) {
            connection.disconnect();
        } else if (!hypeBot) {
            await joinSketchyCloset(client);
        }
    });

    pollLeagueGameClient();
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);
