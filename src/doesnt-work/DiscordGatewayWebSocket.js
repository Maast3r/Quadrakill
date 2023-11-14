import WebSocket from 'ws';
import DiscordVoiceWebSocket from './DiscordVoiceWebSocket.js';

export const DISCORD_GATEWAY_ENDPOINT = 'https://discordapp.com/api/gateway';
export const DISCORD_GATEWAY_SUFFIX = '?v=10&encoding=json';
const DISCORD_SERVER_ID = '134514320578052096';
const DISCORD_CHANNEL_ID = '472224402113560586';
const BOT_NAME = 'Hype Man';
const JITTER = Math.floor(Math.random() * 1);

const OPS = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    VOICE_STATE: 4,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_ACK: 11,
    REQUEST_SOUNDBOARD_SOUNDS: 31,
};

// https://ziad87.net/intents/
export default class DiscordGatewayWebSocket extends WebSocket {
    constructor(gatewayUrl) {
        super(gatewayUrl);

        this.on('message', this._onMessage.bind(this));

        this.sessionId = null;
        this.awaitingAck = false;
        this.lastSequence = null;
        this.hasAcknowledged = 0;
        this.hasConnected = 0;
        this.heartbeatInterval;
        this.resumeGatewayUrl;
// {
//     volume: 0.6985294117647058,
//     user_id: '116741116937633792',
//     sound_id: '1109663676039962715',
//     name: 'Sus',
//     guild_id: '134514320578052096',
//     emoji_name: null,
//     emoji_id: '1109663503754723328',
//     available: true
// }
        this.soundboardSounds = {};
        this.voiceWebSocket;
    }

    close() {
        super.close();
    }

    terminate() {
        super.terminate();
    }


    send(message) {
        super.send(JSON.stringify(message));
    }

    sendHeartbeat() {
        if (this.awaitingAck) {
            console.error('something is wrong, did not ack last heartbeat');
        }
        console.log('sending heartbeat');
        this.awaitingAck = true; 
        this.send({ d: this.lastSequence, op: OPS.HEARTBEAT });
    }

    sendHeartbeats() {
        setTimeout(() => {
            this.sendHeartbeat();
            this.sendHeartbeats();
        }, this.heartbeatInterval);
    }

    sendIdentify() {
        this.send({
            d: {
                token: process.env.DISCORD_BOT_TOKEN,
                // intents: 8,
                intents: 130808,
                properties: {
                    os: 'windows',
                    browser: BOT_NAME,
                    device: BOT_NAME,
                },
            },
            op: OPS.IDENTIFY,
        });
    }

    joinSketchyCloset() {
        this.send({
            d: {
                guild_id: DISCORD_SERVER_ID,
                channel_id: DISCORD_CHANNEL_ID,
                self_mute: false,
                self_deaf: false,
            },
            op: OPS.VOICE_STATE,
        });
    }

    requestSoundboardSounds() {
        this.send({
            d: {
                guild_ids: [DISCORD_SERVER_ID],
            },
            op: OPS.REQUEST_SOUNDBOARD_SOUNDS,
        });
    }

    _onMessage(message) {
        const data = JSON.parse(message);
        // console.log('gateway web socket got message', data);

        switch (data.op) {
            case OPS.HELLO:
                // heartbeat event, opcode 1
                // first heartbeat sent every heartbeat_interval * jitter (random 0-1)
                // the remaining sent every heartbeat interval
                this.heartbeatInterval = data.d.heartbeat_interval;
                setTimeout(() => {
                    console.log('sending first heartbeat');
                    this.sendHeartbeat();
                    // sendHeartbeats();
                }, this.heartbeatInterval * JITTER);
                break;
            case OPS.HEARTBEAT_ACK:
                this.hasAcknowledged += 1;
                console.log('discord ack our heartbeat');
                this.awaitingAck = false;

                if (this.hasAcknowledged === 1) {
                    // identify
                    this.sendIdentify();
                }
                break;
            case OPS.HEARTBEAT:
                console.log('discord requesting heartbeat');
                this.awaitingAck = false;
                this.send(HEARTBEAT_PAYLOAD);
                break;
            case OPS.DISPATCH:
                this.hasConnected += 1;
                this.resumeGatewayUrl = data.resume_gateway_url;
                if (data.d.session_id) {
                    this.sessionId = data.d.session_id;
                }

                // if (data.t === 'VOICE_STATE_UPDATE') {
                //     asdf = data.d.session_id;
                // }

                if (this.hasConnected === 1) {
                    console.log(`${BOT_NAME} ready and connected`);
                    this.joinSketchyCloset();
                    // requestSoundboardSounds();
                } else if (data.d.soundboard_sounds) {
                    this.soundboardSounds = data.d.soundboard_sounds;
                }
                break;
            default:
                break;
        }

        if (data.t === 'VOICE_SERVER_UPDATE' && !this.voiceWebSocket) {
            console.log('creating voice web socket', );
            const voiceWebSocket = new DiscordVoiceWebSocket({
                data: {
                    ...data.d,
                    sessionId: this.sessionId,
                    channelId: DISCORD_CHANNEL_ID,
                },
                url: `wss://${data.d.endpoint}`,
            });
        }
    }
};
