import axios from 'axios';
import DiscordGatewayWebSocket, { DISCORD_GATEWAY_ENDPOINT, DISCORD_GATEWAY_SUFFIX} from './DiscordGatewayWebSocket.js';

const getGateway = async () => {
    return (await axios.get(DISCORD_GATEWAY_ENDPOINT)).data.url + DISCORD_GATEWAY_SUFFIX;
};

const beginDiscordWebSocketConnection = async () => {
    const websocketGatewayUrl = await getGateway();
    console.log(websocketGatewayUrl);
    
    const webSocket = new DiscordGatewayWebSocket(websocketGatewayUrl);

    webSocket.onopen = () => {
        console.log('ws open');
    };
};

await beginDiscordWebSocketConnection();
