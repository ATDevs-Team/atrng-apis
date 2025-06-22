# ATRNG APIs – Python, Node.js, TypeScript & Java Clients

**Version:** 1.3.2

A client library for interacting with the ATDevs Random Number Generator (ATRNG) APIs via WebSocket and HTTP, available for Python, Node.js (JavaScript), TypeScript, and Java.

---

## Table of Contents

- [Features](#features)
- [Python Installation](#python-installation)
- [Node.js Installation](#nodejs-installation)
- [TypeScript Installation](#typescript-installation)
- [Java Installation](#java-installation)
- [Basic Python Usage](#basic-python-usage)
- [Basic Node.js Usage (JavaScript)](#basic-nodejs-usage-javascript)
- [Basic TypeScript Usage](#basic-typescript-usage)
- [Basic Java Usage](#basic-java-usage)
- [API Reference](#api-reference)
  - [Python (atrng_utils.py)](#python-atrng_utilspy)
  - [Node.js (atrng_utils.js)](#nodejs-atrng_utilsjs)
  - [TypeScript (atrng_utils.ts)](#typescript-atrng_utilsts)
  - [Java (atrng_utils.java)](#java-atrng_utilsjava)
- [Notes](#notes)
- [License](#license)

---

## Features

- Connects to the ATDevs RNG WebSocket server (`wss://rng-dump.atdevs.org`)
- Sends periodic 128-byte random keepalive packets
- Buffers discard data, sends every 10 seconds as SHA-512 hash
- Fetches random data from HTTP API and returns hashed random strings or big integers
- Thread-safe discard buffering and background thread management
- Simple API to start/stop background tasks and send arbitrary data

---

## Python Installation

No external installation is required beyond the dependencies below.

### Requirements

- Python 3.6+
- `socketio` Python client
- `requests` library

Install dependencies with pip:

```bash
pip install "python-socketio[client]" requests
```

---

## Node.js Installation

You can use the provided Node.js client (`atrng_utils.js`) to interact with ATRNG APIs.

### Requirements

- Node.js 14+
- `axios`
- `socket.io-client`
- Node.js built-in `crypto` module

Install dependencies:

```bash
npm install axios socket.io-client
```

Copy `atrng_utils.js` into your project directory.

---

## TypeScript Installation

A native TypeScript module (`atrng_utils.ts`) is provided for type-safe usage.

### Requirements

- Node.js 14+
- TypeScript 4.x+
- `axios`
- `socket.io-client`
- Node.js built-in `crypto` module

Install dependencies:

```bash
npm install axios socket.io-client
npm install --save-dev typescript @types/node
```

Copy `atrng_utils.ts` into your project.

---

## Java Installation

A Java client (`atrng_utils.java`) is included for JVM-based projects.

### Requirements

- Java 8 or higher
- [socket.io-client Java library](https://github.com/socketio/socket.io-client-java) *(for WebSocket support)*
- No external dependencies for HTTP/crypto, uses standard JDK

#### Add socket.io-client dependency (Maven example):

```xml
<dependency>
  <groupId>io.socket</groupId>
  <artifactId>socket.io-client</artifactId>
  <version>1.0.0</version>
</dependency>
```
*(Or use Gradle, or download the jar manually as appropriate for your build system.)*

Copy `atrng_utils.java` into your project.

---

## Basic Python Usage

```python
import atrng_utils  # (Assuming saved as atrng_utils.py)

# Start the client: connects and starts background keepalive/discard loops
atrng_utils.start()

# Send arbitrary data to the server
atrng_utils.send_data_to_server("Hello, server!")

# Add data to the discard buffer (hashed and sent every 10s)
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

## Basic Node.js Usage (JavaScript)

```javascript
const atrng = require('./atrng_utils.js');

// Start the client: connects and starts keepalive and discard loops
atrng.start();

// Send arbitrary data to the server
atrng.sendDataToServer('Hello, ATRNG server!');

// Add data to the discard buffer (hashed and sent every 10s)
atrng.discard('Some data to discard');

// Fetch a random hashed string (SHA-512 hex digest)
atrng.getRngStr().then(hex => {
  console.log('Random hex:', hex);
});

// Fetch a random number as a big integer (SHA-512 digest interpreted as int string)
atrng.getRngNum().then(num => {
  console.log('Random number:', num);
});

// Stop background tasks when done
atrng.stopKeepalive();
atrng.stopDiscardLoop();
```

---

## Basic TypeScript Usage

```typescript
import { 
  start, stopKeepalive, stopDiscardLoop, 
  sendDataToServer, getRngStr, getRngNum, discard 
} from "./atrng_utils";

// Start the client: connects and starts keepalive and discard loops
start();

// Send arbitrary data to the server
sendDataToServer('Hello, ATRNG server!');

// Add data to the discard buffer (hashed and sent every 10s)
discard('Some data to discard');

// Fetch a random hashed string (SHA-512 hex digest)
getRngStr().then(hex => {
  console.log('Random hex:', hex);
});

// Fetch a random number as a BigInt (SHA-512 digest interpreted as int)
getRngNum().then(num => {
  console.log('Random number:', num.toString());
});

// Stop background tasks when done
stopKeepalive();
stopDiscardLoop();
```

---

## Basic Java Usage

```java
// Assuming you have atrng_utils.java compiled and in your classpath

public class Example {
    public static void main(String[] args) throws Exception {
        // Start the client: connects and starts keepalive/discard loops
        AtrngUtils.start();

        // Send arbitrary data to the server
        AtrngUtils.sendDataToServer("Hello, ATRNG server!");

        // Add data to the discard buffer (hashed and sent every 10s)
        AtrngUtils.discard("Some data to discard");

        // Fetch a random hashed string (SHA-512 hex digest)
        String randomHex = AtrngUtils.getRngStr();
        System.out.println("Random hex: " + randomHex);

        // Fetch a random number as a BigInteger (SHA-512 digest interpreted as int)
        java.math.BigInteger randomNum = AtrngUtils.getRngNum();
        System.out.println("Random number: " + randomNum);

        // Stop background tasks when done
        AtrngUtils.stopKeepalive();
        AtrngUtils.stopDiscardLoop();
    }
}
```

---

## API Reference

### Python (atrng_utils.py)

- **start()**  
  Connects to the WebSocket server and starts background keepalive and discard tasks.

- **start_keepalive()**  
  Starts the background thread to send 128 random bytes every 10s.

- **stop_keepalive()**  
  Stops the keepalive background thread.

- **send_data_to_server(data)**  
  Sends `data` (string or bytes) to the WebSocket server.

- **get_rng_str() -> str**  
  Fetches random data from HTTP API, hashes with SHA-512, returns hex string.

- **get_rng_num() -> int**  
  Fetches random data from HTTP API, hashes with SHA-512, returns as big integer.

- **discard(data)**  
  Adds `data` to discard buffer, sent every 10s.

- **start_discard_loop()**  
  Starts the discard background thread.

- **stop_discard_loop()**  
  Stops the discard background thread.

---

### Node.js (atrng_utils.js)

- **start()**  
  Connects to the WebSocket server and starts background keepalive and discard loops.

- **startKeepalive()**  
  Starts the keepalive interval to send 128 random bytes every 10s.

- **stopKeepalive()**  
  Stops the keepalive interval.

- **sendDataToServer(data: string | Buffer)**  
  Sends data to the WebSocket server.

- **getRngStr() → Promise\<string\>**  
  Fetches random data from HTTP API, hashes with SHA-512, returns hex string.

- **getRngNum() → Promise\<string\>**  
  Fetches random data from HTTP API, hashes with SHA-512, returns as a big integer string (for arbitrary size).

- **discard(data: string | Buffer)**  
  Adds data to the discard buffer to be hashed and sent every 10s.

- **startDiscardLoop()**  
  Starts the discard interval.

- **stopDiscardLoop()**  
  Stops the discard interval.

---

### TypeScript (atrng_utils.ts)

- **start()**  
  Connects to the WebSocket server and starts background keepalive and discard loops.

- **stopKeepalive()**  
  Stops the keepalive interval.

- **stopDiscardLoop()**  
  Stops the discard interval.

- **sendDataToServer(data: string \| Buffer)**  
  Sends data to the WebSocket server.

- **getRngStr() → Promise\<string\>**  
  Fetches random data from HTTP API, hashes with SHA-512, returns hex string.

- **getRngNum() → Promise\<bigint\>**  
  Fetches random data from HTTP API, hashes with SHA-512, returns as a BigInt.

- **discard(data: string \| Buffer)**  
  Adds data to the discard buffer to be hashed and sent every 10s.

---

### Java (atrng_utils.java)

- **start()**  
  Connects to the WebSocket server and starts background keepalive and discard threads.

- **startKeepalive()**  
  Starts the keepalive scheduled task to send 128 random bytes every 10s.

- **stopKeepalive()**  
  Stops the keepalive scheduled task.

- **sendDataToServer(Object data)**  
  Sends data (String or byte[]) to the WebSocket server.

- **getRngStr() → String**  
  Fetches random data from HTTP API, hashes with SHA-512, returns hex string.

- **getRngNum() → BigInteger**  
  Fetches random data from HTTP API, hashes with SHA-512, returns as a BigInteger.

- **discard(Object data)**  
  Adds data (String or byte[]) to the discard buffer, sent every 10s.

- **startDiscardLoop()**  
  Starts the discard scheduled task.

- **stopDiscardLoop()**  
  Stops the discard scheduled task.

---

## Notes

- Keepalive and discard loops run in the background; they do not block your main program.
- The WebSocket connection auto-reconnects on failure.
- The HTTP API endpoint is `https://rng-api.atdevs.org/random` for raw random bytes.
- Data sent to discard is hashed before transmission to enhance privacy/security.
- See the status of the APIs this talks to here: https://status.atdevs.org. (the names are "True RNG API", and "RNG Dump APIs")
---

## License

Apache 2.0
