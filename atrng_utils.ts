import { io, Socket } from "socket.io-client";
import crypto from "crypto";
import axios from "axios";

const WS_SERVER_URL = 'wss://rng-dump.atdevs.org';

const KEEPALIVE_INTERVAL = 10 * 1000; // ms
const KEEPALIVE_SIZE = 128;

let sio: Socket | null = null;
let keepaliveInterval: NodeJS.Timeout | null = null;
let discardInterval: NodeJS.Timeout | null = null;

let discardBuffer: Buffer = Buffer.alloc(0);

function connect() {
    if (sio && sio.connected) return;
    sio = io(WS_SERVER_URL, { transports: ["websocket"] });
    sio.on("connect", () => {
        console.log("[ATAPI-RNG] Connected to server.");
    });
    sio.on("connect_error", (err: any) => {
        console.log("[ATAPI-RNG] Connection failed:", err);
    });
}

function startKeepalive() {
    if (keepaliveInterval) return;
    keepaliveInterval = setInterval(() => {
        if (!sio || !sio.connected) connect();
        if (sio && sio.connected) {
            try {
                sio.emit("message", crypto.randomBytes(KEEPALIVE_SIZE));
                console.log("[KEEPALIVE] Sent 128 bytes of random data");
            } catch (e) {
                console.log("[KEEPALIVE] Emit failed:", e);
            }
        }
    }, KEEPALIVE_INTERVAL);
    console.log("[ATAPI-RNG] Keepalive started.");
}

function stopKeepalive() {
    if (keepaliveInterval) clearInterval(keepaliveInterval);
    keepaliveInterval = null;
    console.log("[ATAPI-RNG] Keepalive stopped.");
}

function sendDataToServer(data: string | Buffer) {
    const buf = (typeof data === "string") ? Buffer.from(data) : data;
    connect();
    if (sio && sio.connected) {
        try {
            sio.emit("message", buf);
        } catch (e) {
            console.log("[ATAPI-RNG] Data send failed:", e);
        }
    }
}

export async function getRngStr(): Promise<string> {
    const url = "https://rng-api.atdevs.org/random";
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const data = Buffer.from(response.data);
    const hashed = crypto.createHash("sha512").update(data).digest("hex");
    return hashed;
}

export async function getRngNum(): Promise<bigint> {
    const url = "https://rng-api.atdevs.org/random";
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const data = Buffer.from(response.data);
    const hashed = crypto.createHash("sha512").update(data).digest();
    return BigInt('0x' + hashed.toString('hex'));
}

export function discard(data: string | Buffer) {
    const buf = (typeof data === "string") ? Buffer.from(data) : data;
    discardBuffer = Buffer.concat([discardBuffer, buf]);
}

function startDiscardLoop() {
    if (discardInterval) return;
    discardInterval = setInterval(() => {
        connect();
        if (sio && sio.connected && discardBuffer.length > 0) {
            try {
                const hashed = crypto.createHash("sha512").update(discardBuffer).digest();
                sio.emit("message", hashed);
                console.log(`[DISCARD] Sent SHA-512 hash of ${discardBuffer.length} bytes`);
                discardBuffer = Buffer.alloc(0);
            } catch (e) {
                console.log("[DISCARD] Emit failed:", e);
            }
        }
    }, 10 * 1000);
    console.log("[ATAPI-RNG] Discard loop started.");
}

function stopDiscardLoop() {
    if (discardInterval) clearInterval(discardInterval);
    discardInterval = null;
    console.log("[ATAPI-RNG] Discard loop stopped.");
}

export function start() {
    connect();
    startKeepalive();
    startDiscardLoop();
}

// Optionally export stop functions:
export { stopKeepalive, stopDiscardLoop, sendDataToServer };
