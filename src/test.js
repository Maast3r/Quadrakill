import Quadrakill from './index.js';
import { join } from 'node:path';

const prefix = process.cwd();

const GAME_EVENTS_TO_AUDIO = {
    // GameStart: './sound-clips/quadraaa-kill.mp3', // for testing
    // MinionsSpawning: './sound-clips/quadraaa-kill.mp3', // for testing
    GameStart: {
        soundFile: `${prefix}/sound-clips/double-kill.mp3`,
        volume: 0.4,
    },
    MinionsSpawning: {
        soundFile: `${prefix}/sound-clips/quadraaa-kill.mp3`,
        volume: 0.4,
    },
    FirstBrick: {},
    TurretKilled: {},
    InhibKilled: {},
    DragonKill: {},
    DragonKillStolen: {},
    DragonKillElder: {},
    DragonKillElderStolen: {
        soundFile: `${prefix}/sound-clips/40IQ.mp3`,
        volume: 0.4,
    },
    HeraldKill: {},
    HeraldKillStolen: {
        soundFile:  `${prefix}/sound-clips/40IQ.mp3`,
        volume: 0.4,
    },
    BaronKill: {},
    BaronKillStolen: {
        soundFile:  `${prefix}/sound-clips/40IQ.mp3`,
        volume: 0.4,
    },
    ChampionKill: {},
    Multikill2: {
        soundFile:  `${prefix}/sound-clips/double-kill.mp3`,
        volume: 0.5,
    },
    Multikill3: {
        soundFile: `${prefix}/sound-clips/oh=baby-a-triple.mp3`,
        volume: 0.5,
    },
    Multikill4: {
        soundFile: `${prefix}/sound-clips/quadraaa-kill.mp3`,
        volume: 0.5,
    },
    Multikill5: {
        soundFile: `${prefix}/sound-clips/penta-kill.mp3`,
        volume: 0.5,
    },
    Ace: {},
    FirstBlood: {
        soundFile: `${prefix}/sound-clips/faker-what-was-that.mp3`,
        volume: 0.5,
    },
};
const ELIGIBLE_PLAYERS = new Set([
    'Mike Cheek',
    'baseballover723',
    'Doomerdinger',
]);

const quadraKill = new Quadrakill({
    eligiblePlayers: ELIGIBLE_PLAYERS,
    gameEventsToAudio: GAME_EVENTS_TO_AUDIO,
});

quadraKill.joinSketchyCloset();