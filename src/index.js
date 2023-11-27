import axios from 'axios';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
} from '@discordjs/voice';
import events from 'events';
import { join } from 'node:path';

const LEAGUE_GAME_URL = 'https://127.0.0.1:2999/';
const LEAGUE_GAME_EVENTS_ENDPOINT = '/liveclientdata/eventdata';

const DISCORD_SERVER_ID = '134514320578052096';
const DISCORD_CHANNEL_ID = '472224402113560586';
const BOT_ID = '1173056510125944832';
const POLL_RATE = 1_000;

axios.defaults.baseURL = LEAGUE_GAME_URL;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

export default class Quadrakill {
    constructor({ eligiblePlayers, gameEventsToAudio }) {
        this.audioQueue = [];
        this.channel;
        this.client;
        this.connection;
        this.eligiblePlayers = eligiblePlayers;
        this.gameEventsToAudio = gameEventsToAudio;
        this.isIdle = true;
        this.lastIndexRead = 0;
        this.player;

        this.eventEmitter = new events.EventEmitter();

        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });

        this.discordClient.login(process.env.DISCORD_BOT_TOKEN);
        this.discordClient.once(Events.ClientReady, this.onDiscordClientReady);
    }

    updateVoiceState = (oldState, _) => {
        if (oldState.channel) {
            const hypeBot = oldState.channel.members.find(
                (member) => member.user.id === BOT_ID
            );

            if (hypeBot && oldState.channel.members.size <= 1) {
                this.leaveSketchyCloset();
            } else if (!hypeBot && oldState.channel.members.size > 0) {
                // todo: why does the bot randomly disconnect?
                // auto re-joining here isn't the answer
                // this.joinSketchyCloset();
            }
        }
    };

    onDiscordClientReady = async (client) => {
        this.client = client;
        this.channel = await this.client.channels.fetch(DISCORD_CHANNEL_ID);

        console.log(`Ready! Logged in as ${this.client.user.tag}`);

        client.on('voiceStateUpdate', this.updateVoiceState);
        client.on('presenceUpdate', (old, neww) => {
            console.log('new', neww);
        });

        this.eventEmitter.emit('ready');
    };

    joinSketchyCloset = async () => {
        // only start polling league when connected to the voice channel
        this.pollLeagueGameClient();

        this.connection = joinVoiceChannel({
            adapterCreator: this.channel.guild.voiceAdapterCreator,
            channelId: this.channel.id,
            guildId: DISCORD_SERVER_ID,
            selfDeaf: false,
        });

        this.player = createAudioPlayer();
        this.player.play(createAudioResource(join(process.cwd()), '40IQ.mp3')); // need to start it, idk why
        this.connection.subscribe(this.player);

        this.player.on(AudioPlayerStatus.Playing, () => {
            this.isIdle = false;
        });

        this.player.on('error', (error) => {
            this.isIdle = true;
            console.error(
                `Error: ${error.message} with resource ${error.resource.metadata.title}`
            );
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.isIdle = true;

            if (this.audioQueue.length > 0) {
                this.player.play(this.audioQueue.shift());
            }
        });

        this.eventEmitter.emit('connected');
    };

    leaveSketchyCloset = () => {
        this.connection.disconnect();
        this.eventEmitter.emit('disconnected');
    };

    isDisconnected = () => {
        return !this.connection || this.connection.state.status === 'disconnected';
    }

    pollLeagueGameClient = async () => {
        const eventData = await axios
            .get(LEAGUE_GAME_EVENTS_ENDPOINT)
            .then((response) => response.data)
            .catch(() => {
                this.lastIndexRead = 0; // not in game, reset event counter
            });

        if (eventData?.Events && this.lastIndexRead < eventData.Events.length) {
            for (
                this.lastIndexRead;
                this.lastIndexRead < eventData.Events.length;
                this.lastIndexRead++
            ) {
                this.addToAudioQueue(eventData.Events[this.lastIndexRead]);
            }
        }

        setTimeout(this.pollLeagueGameClient, POLL_RATE);
    };

    getGameEvent = (event) => {
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

    addToAudioQueue = (event) => {
        const gameEvent = this.getGameEvent(event);
        const audio = this.gameEventsToAudio[gameEvent];
        const isKillEvent = Boolean(event?.KillerName);

        if (
            (!isKillEvent && audio?.soundFile) ||
            (isKillEvent && audio?.soundFile && this.eligiblePlayers.has(event.KillerName))
        ) {
            const audioResource = createAudioResource(audio.soundFile, {
                inlineVolume: true,
            });
            audioResource.volume.setVolume(audio.volume);
            this.audioQueue.push(audioResource);

            if (this.isIdle) {
                console.log('playing:', audio.soundFile);
                this.player.play(this.audioQueue.shift());
            }
        }
    };
}
