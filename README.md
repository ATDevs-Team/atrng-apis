
# ATAPI-RNG Python Client

**Version:** 1.3.2

A Python client library for interacting with the ATDevs RNG WebSocket and HTTP APIs.  
This client handles connection management, sending random data keepalive packets, buffered "discard" data sending, and fetching hashed random numbers.

---

## Features

- Connects to the ATDevs RNG WebSocket server (`wss://rng-dump.atdevs.org`)  
- Sends periodic 128-byte random keepalive packets  
- Buffered discard data sending every 10 seconds as a SHA-512 hash  
- Fetches random data from HTTP API and returns hashed random strings or big integers  
- Thread-safe discard buffering and background thread management  
- Simple API to start/stop background tasks and send arbitrary data  

---

## Installation

No external installation is required beyond the dependencies below.

### Requirements

- Python 3.6+  
- `socketio` Python client  
- `requests` library  

Install dependencies with pip:

```bash
pip install "python-socketio[client]" requests
````

---

## Usage

Import the module and use the provided functions to interact with the RNG service.

### Basic usage

```python
import atrng_utils  # (Assuming saved as atrng_utils.py)

# Start the client: connects and starts background keepalive and discard loops
atrng_utils.start()

# Send arbitrary data to the server
atrng_utils.send_data_to_server("Hello, server!")

# Add data to the discard buffer (hashed and sent every 10 seconds)
atrng_utils.discard("Some data to discard")

# Fetch a random hashed string (SHA-512 hex digest)
random_hex = atrng_utils.get_rng_str()
print(f"Random hex: {random_hex}")

# Fetch a random number as a big integer (SHA-512 digest interpreted as int)
random_num = atrng_utils.get_rng_num()
print(f"Random number: {random_num}")

# Stop background tasks when done
atrng_utils.stop_keepalive()
atrng_utils.stop_discard_loop()
```

---

## API Reference

### `start()`

Connects to the WebSocket server and starts the background keepalive and discard threads.

---

### `start_keepalive()`

Starts the background thread that sends 128 bytes of random data every 10 seconds as a keepalive message.

---

### `stop_keepalive()`

Stops the keepalive background thread.

---

### `send_data_to_server(data)`

Send `data` (string or bytes) to the WebSocket server immediately via the `"message"` event. Automatically connects if not connected.

* `data`: `str` or `bytes`

---

### `get_rng_str() -> str`

Fetches random data from the HTTP RNG API, hashes it with SHA-512, and returns the hex string digest.

May raise exceptions from `requests` on network errors.

---

### `get_rng_num() -> int`

Fetches random data from the HTTP RNG API, hashes it with SHA-512, and returns the digest interpreted as a large unsigned integer.

May raise exceptions from `requests` on network errors.

---

### `discard(data)`

Adds `data` (string or bytes) to an internal buffer to be hashed and sent every 10 seconds.

* `data`: `str` or `bytes`

This method is thread-safe and returns immediately.

---

### `start_discard_loop()`

Starts the background thread that every 10 seconds hashes the discard buffer and sends it to the server.

---

### `stop_discard_loop()`

Stops the discard background thread.

---

## Notes

* Keepalive and discard loops run in background daemon threads. They will not prevent your program from exiting if main threads finish.
* The WebSocket connection auto-reconnects on failure during keepalive and discard cycles.
* `discard()` batches data to reduce frequent network calls and hashes data before sending to maintain privacy.
* The HTTP API endpoints are `https://rng-api.atdevs.org/random` for raw random bytes.

---

## License

Apache 2.0

