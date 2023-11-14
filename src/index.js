
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
    GameStart: './sound-clips/quadraaa-kill.mp3',
    MinionsSpawning: './sound-clips/quadraaa-kill.mp3',
    FirstBrick: './sound-clips/quadraaa-kill.mp3',
    TurretKilled: './sound-clips/quadraaa-kill.mp3',
    InhibKilled: './sound-clips/quadraaa-kill.mp3',
    DragonKill: './sound-clips/quadraaa-kill.mp3',
    DragonKillStolen: './sound-clips/quadraaa-kill.mp3',
    DragonKillElder: './sound-clips/quadraaa-kill.mp3',
    DragonKillElderStolen: './sound-clips/quadraaa-kill.mp3',
    HeraldKill: './sound-clips/quadraaa-kill.mp3',
    HeraldKillStolen: './sound-clips/quadraaa-kill.mp3',
    BaronKill: './sound-clips/quadraaa-kill.mp3',
    BaronKillStolen: './sound-clips/quadraaa-kill.mp3',
    ChampionKill: './sound-clips/quadraaa-kill.mp3',
    MultiKill2: './sound-clips/quadraaa-kill.mp3',
    MultiKill3: './sound-clips/quadraaa-kill.mp3',
    MultiKill4: './sound-clips/quadraaa-kill.mp3',
    MultiKill5: './sound-clips/quadraaa-kill.mp3',
    Ace: './sound-clips/quadraaa-kill.mp3',
    FirstBlood: './sound-clips/quadraaa-kill.mp3',
};

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let player;
let subscription; // idk if i actually need this here
let lastIndexRead = 0; 
const audioQueue = [];
let isIdle = true;

axios.defaults.baseURL = LEAGUE_GAME_URL;

const pollLeagueGameClient = async () => {
    const eventData = await axios.get(LEAGUE_GAME_EVENTS_ENDPOINT).then((response) => {
        return response.data;
    }).catch(() => {
        lastIndexRead = 0; // not in game, reset event counter
    });
    
    if (eventData?.Events && lastIndexRead < eventData.Events.length) {
        for (lastIndexRead; lastIndexRead < eventData.Events.length; lastIndexRead++) {
            audioQueue.push(getAudioResource(eventData.Events[lastIndexRead]));

            if (isIdle) {
                player.play(audioQueue.shift());
            }
        }
    }

    setTimeout(pollLeagueGameClient, POLL_RATE);
};

const getAudioResource = (event) => {
    let gameEvent;

    if (event.EventName === 'DragonKill') {
        const isElder = event.DragonType === 'Elder';
        const isStolen = event.Stolen === 'True';
        gameEvent = `${event.EventName}${isElder ? 'Elder' : ''}${isStolen === 't' ? 'Stolen' : ''}`;
    } else if (event.EventName === 'HeraldKill' || event.eventName === 'BaronKill') {
        const isStolen = event.Stolen === 'True';
        gameEvent = `${event.EventName}${isStolen ? 'Stolen' : ''}`;
    } else if (event.EventName === 'MultiKill') {
        gameEvent = `${event.eventName}${event.KillStreak}`
    } else {
        gameEvent = event.EventName;
    }
    // if executed, it will still have the minion/tower's name as the KillerName
    // eg: SRU_Baron killed Mike Cheek
    // maybe add something to do with who the killer is for each event?

    return createAudioResource(join(process.cwd(), GAME_EVENTS_TO_AUDIO[gameEvent]));
};

discordClient.once(Events.ClientReady, async (client) => {
	console.log(`Ready! Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: DISCORD_SERVER_ID,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    player = createAudioPlayer();
    player.play(createAudioResource(join(process.cwd()), '40IQ.mp3')); // need to start it
    subscription = connection.subscribe(player);
    // subscription.unsubscribe()

    player.on(AudioPlayerStatus.Playing, () => {
        console.log('The audio player has started playing!');
    });

    player.on('error', (error) => {
        console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
        console.log('idleeee');
        isIdle = true;

        if (audioQueue.length > 0) {
            player.play(audioQueue.shift());
        }
    });

    pollLeagueGameClient();
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);
