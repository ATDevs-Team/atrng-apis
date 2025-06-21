const axios = require('axios');
const crypto = require('crypto');
const { io } = require('socket.io-client');

const WS_SERVER_URL = 'wss://rng-dump.atdevs.org';
const KEEPALIVE_INTERVAL = 10 * 1000; // ms
const KEEPALIVE_SIZE = 128;

let sio = null;
let keepaliveInterval = null;
let discardInterval = null;
let discardBuffer = Buffer.alloc(0);

function connect() {
    if (!sio || !sio.connected) {
        sio = io(WS_SERVER_URL, { transports: ['websocket'] });
        sio.on('connect', () => console.log('[ATAPI-RNG] Connected to server.'));
        sio.on('connect_error', err => console.log(`[ATAPI-RNG] Connection failed: ${err}`));
    }
}

function startKeepalive() {
    if (keepaliveInterval) return;
    connect();
    keepaliveInterval = setInterval(() => {
        if (!sio.connected) connect();
        if (sio.connected) {
            try {
                sio.emit('message', crypto.randomBytes(KEEPALIVE_SIZE));
                console.log('[KEEPALIVE] Sent 128 bytes of random data');
            } catch (e) {
                console.log(`[KEEPALIVE] Emit failed: ${e}`);
            }
        }
    }, KEEPALIVE_INTERVAL);
    console.log('[ATAPI-RNG] Keepalive started.');
}

function stopKeepalive() {
    if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
        console.log('[ATAPI-RNG] Keepalive stopped.');
    }
}

function sendDataToServer(data) {
    if (typeof data === 'string') data = Buffer.from(data);
    else if (!Buffer.isBuffer(data)) throw new TypeError('Data must be string or Buffer');
    connect();
    if (sio.connected) {
        try {
            sio.emit('message', data);
        } catch (e) {
            console.log(`[ATAPI-RNG] Data send failed: ${e}`);
        }
    }
}

function getRngStr() {
    return axios.get('https://rng-api.atdevs.org/random', { responseType: 'arraybuffer' })
        .then(response => {
            const hash = crypto.createHash('sha512').update(Buffer.from(response.data)).digest('hex');
            return hash;
        });
}

function getRngNum() {
    return axios.get('https://rng-api.atdevs.org/random', { responseType: 'arraybuffer' })
        .then(response => {
            const hash = crypto.createHash('sha512').update(Buffer.from(response.data)).digest();
            // Convert buffer to big integer (as string to avoid JS number limits)
            return BigInt('0x' + hash.toString('hex')).toString();
        });
}

// Discard buffer system
function discard(data) {
    if (typeof data === 'string') data = Buffer.from(data);
    else if (!Buffer.isBuffer(data)) throw new TypeError('Data must be string or Buffer');
    discardBuffer = Buffer.concat([discardBuffer, data]);
}

function startDiscardLoop() {
    if (discardInterval) return;
    discardInterval = setInterval(() => {
        connect();
        if (sio.connected && discardBuffer.length > 0) {
            try {
                const hashed = crypto.createHash('sha512').update(discardBuffer).digest();
                sio.emit('message', hashed);
                console.log(`[DISCARD] Sent SHA-512 hash of ${discardBuffer.length} bytes`);
                discardBuffer = Buffer.alloc(0);
            } catch (e) {
                console.log(`[DISCARD] Emit failed: ${e}`);
            }
        }
    }, 10 * 1000);
    console.log('[ATAPI-RNG] Discard loop started.');
}

function stopDiscardLoop() {
    if (discardInterval) {
        clearInterval(discardInterval);
        discardInterval = null;
        console.log('[ATAPI-RNG] Discard loop stopped.');
    }
}

function start() {
    connect();
    startKeepalive();
    startDiscardLoop();
}

module.exports = {
    start,
    startKeepalive,
    stopKeepalive,
    sendDataToServer,
    getRngStr,
    getRngNum,
    discard,
    startDiscardLoop,
    stopDiscardLoop
};
