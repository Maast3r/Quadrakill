import crypto from 'crypto';
import WebSocket from 'ws';

const OPS = {
    IDENTIFY: 0,
    SELECT_PROTOCOL: 1,
    READY: 2,
    HEARTBEAT: 3,
    SESSION_DESCRIPTION: 4,
    SPEAKING: 5,
    HEARTBEAT_ACK: 6,
    HELLO: 8,
};

const BOT_ID = '1173056510125944832';
const MODE = 'xsalsa20_poly1305';

export default class DiscordVoiceWebSocket extends WebSocket {
    constructor({ data, url }) {
        super(url);

        this.on('message', this._onMessage.bind(this));

        this.sessionId = data.sessionId;
        this.heartbeatInterval;
        this.token = data.token;
        this.guildId = data.guild_id;
        this.channelId = data.channelId;
        this.ip;
        this.port;
        this.secretKey;
        this.ssrc;
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

    generateNonce() {
        return crypto.randomBytes(16).toString('base64');
    }

    sendHeartbeat() {
        console.log('sending voice heartbeat');
        this.send({ d: this.generateNonce(), op: OPS.HEARTBEAT });
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
                server_id: this.guildId,
                user_id: BOT_ID,
                session_id: this.sessionId,
                token: this.token,
            },
            op: OPS.IDENTIFY,
        });
    }

    sendSelect() {
        this.send({
            d: {
                protocol: 'udp',
                data: {
                    address: this.ip,
                    port: this.port,
                    mode: MODE,
                },
            },
            op: OPS.SELECT_PROTOCOL,
        });
    }

    sendSpeaking() {
        this.send({
            d: {
                speaking: 1,
                delay: 0,
                ssrc: this.ssrc,
            },
            op: OPS.SPEAKING,
        });
    }

    _onMessage(message) {
        const data = JSON.parse(message);
        console.log('voice web socket got message', data);

        switch (data.op) {
            case OPS.HELLO:
                this.heartbeatInterval = data.d.heartbeat_interval;
                this.sendHeartbeats();
                this.sendIdentify();
                break;
            case OPS.READY:
                console.log('voice readyyy');
                this.ip = data.d.ip;
                this.port = data.d.port;
                this.ssrc = data.d.ssrc;
                this.sendSelect();
                break;
            case OPS.SESSION_DESCRIPTION:
                this.secretKey = data.d.secret_key;
                console.log('eeeeeeeeeeeeee');
                console.log()
                break;
            default:
                break;
        }
    }
};
