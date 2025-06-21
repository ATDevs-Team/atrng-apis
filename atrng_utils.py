import os
import time
import threading
import socketio
import hashlib
import requests

__version__ = '1.3.2'
__all__ = [
    'start', 'start_keepalive', 'stop_keepalive',
    'send_data_to_server', 'get_rng_str', 'get_rng_num',
    'discard', 'start_discard_loop', 'stop_discard_loop'
]

# Updated WebSocket server URL (wss over Cloudflare)
WS_SERVER_URL = 'wss://rng-dump.atdevs.org'  # Secure WebSocket via Cloudflared

KEEPALIVE_INTERVAL = 10  # seconds
KEEPALIVE_SIZE = 128     # bytes

# Internal Socket.IO client
sio = socketio.Client(logger=False, engineio_logger=False)

# Internal state
_keepalive_thread = None
_keepalive_running = False

def _connect():
    """
    Internal function to connect if not already connected.
    """
    if not sio.connected:
        try:
            sio.connect(WS_SERVER_URL, transports=['websocket'])
            print("[ATAPI-RNG] Connected to server.")
        except Exception as e:
            print(f"[ATAPI-RNG] Connection failed: {e}")

def _keepalive_loop():
    """
    Internal thread: Sends 128 bytes of CSPRNG data every KEEPALIVE_INTERVAL seconds.
    """
    global _keepalive_running
    while _keepalive_running:
        if not sio.connected:
            _connect()

        if sio.connected:
            try:
                sio.emit('message', os.urandom(KEEPALIVE_SIZE))
                print("[KEEPALIVE] Sent 128 bytes of random data")
            except Exception as e:
                print(f"[KEEPALIVE] Emit failed: {e}")

        time.sleep(KEEPALIVE_INTERVAL)

def start_keepalive():
    """
    Start background keepalive thread (if not already running).
    """
    global _keepalive_thread, _keepalive_running
    if _keepalive_thread and _keepalive_thread.is_alive():
        return
    _keepalive_running = True
    _keepalive_thread = threading.Thread(target=_keepalive_loop, daemon=True)
    _keepalive_thread.start()
    print("[ATAPI-RNG] Keepalive started.")

def stop_keepalive():
    """
    Stop the background keepalive thread.
    """
    global _keepalive_running
    _keepalive_running = False
    print("[ATAPI-RNG] Keepalive stopped.")

def send_data_to_server(data):
    """
    Sends binary or string data to the Socket.IO server via 'message' event.
    Auto-connects if not already connected.
    """
    if isinstance(data, str):
        data = data.encode()
    elif not isinstance(data, (bytes, bytearray)):
        raise TypeError(f"Data must be str or bytes, not {type(data)}")

    _connect()

    if sio.connected:
        try:
            sio.emit('message', data)
        except Exception as e:
            print(f"[ATAPI-RNG] Data send failed: {e}")

def start():
    """
    Convenience startup: connects to server and starts all background threads.
    """
    _connect()
    start_keepalive()
    start_discard_loop()

def get_rng_str():
    """
    Fetches the random data from https://rng-api.atdevs.org/random,
    SHA-512 hashes it, and returns the hash as a hex string.
    Raises requests exceptions on failure.
    """
    url = 'https://rng-api.atdevs.org/random'
    response = requests.get(url)
    response.raise_for_status()
    data = response.content
    hashed = hashlib.sha512(data).hexdigest()
    return hashed

def get_rng_num():
    """
    Fetches the random data from https://rng-api.atdevs.org/random,
    SHA-512 hashes it, and returns the hash as a big integer.
    Raises requests exceptions on failure.
    """
    url = 'https://rng-api.atdevs.org/random'
    response = requests.get(url)
    response.raise_for_status()
    data = response.content
    hashed_bytes = hashlib.sha512(data).digest()
    return int.from_bytes(hashed_bytes, byteorder='big', signed=False)
# --- Additions for discard functionality ---

_discard_buffer = bytearray()
_discard_lock = threading.Lock()
_discard_running = False
_discard_thread = None

def discard(data):
    """
    Quickly places data into the discard buffer.
    """
    if isinstance(data, str):
        data = data.encode()
    elif not isinstance(data, (bytes, bytearray)):
        raise TypeError(f"Data must be str or bytes, not {type(data)}")

    with _discard_lock:
        _discard_buffer.extend(data)

def _discard_loop():
    """
    Background thread: every 10 seconds, hash and send buffer if connected.
    """
    global _discard_running
    while _discard_running:
        time.sleep(10)
        _connect()

        with _discard_lock:
            if sio.connected and _discard_buffer:
                try:
                    hashed = hashlib.sha512(_discard_buffer).digest()
                    sio.emit('message', hashed)
                    print(f"[DISCARD] Sent SHA-512 hash of {len(_discard_buffer)} bytes")
                    _discard_buffer.clear()
                except Exception as e:
                    print(f"[DISCARD] Emit failed: {e}")

def start_discard_loop():
    """
    Start the discard loop thread if not already running.
    """
    global _discard_thread, _discard_running
    if _discard_thread and _discard_thread.is_alive():
        return
    _discard_running = True
    _discard_thread = threading.Thread(target=_discard_loop, daemon=True)
    _discard_thread.start()
    print("[ATAPI-RNG] Discard loop started.")

def stop_discard_loop():
    """
    Stop the discard loop thread.
    """
    global _discard_running
    _discard_running = False
    print("[ATAPI-RNG] Discard loop stopped.")
