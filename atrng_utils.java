import java.io.*;
import java.net.*;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class AtrngUtils {
    public static final String VERSION = "1.3.2";
    private static final String WS_SERVER_URL = "wss://rng-dump.atdevs.org";
    private static final int KEEPALIVE_INTERVAL = 10; // seconds
    private static final int KEEPALIVE_SIZE = 128;    // bytes

    private static Socket sio;
    private static ScheduledExecutorService keepaliveExecutor;
    private static volatile boolean keepaliveRunning = false;

    private static final ByteArrayOutputStream discardBuffer = new ByteArrayOutputStream();
    private static final ReentrantLock discardLock = new ReentrantLock();
    private static ScheduledExecutorService discardExecutor;
    private static volatile boolean discardRunning = false;

    // Socket.IO connection
    private static synchronized void connect() {
        if (sio != null && sio.connected()) return;
        try {
            sio = IO.socket(WS_SERVER_URL);
            sio.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("[ATAPI-RNG] Connected to server.");
                }
            });
            sio.connect();
        } catch (Exception e) {
            System.out.println("[ATAPI-RNG] Connection failed: " + e);
        }
    }

    // Keepalive loop
    private static Runnable keepaliveTask = new Runnable() {
        @Override
        public void run() {
            if (!keepaliveRunning) return;
            connect();
            if (sio != null && sio.connected()) {
                byte[] randomBytes = new byte[KEEPALIVE_SIZE];
                new java.security.SecureRandom().nextBytes(randomBytes);
                sio.emit("message", randomBytes);
                System.out.println("[KEEPALIVE] Sent 128 bytes of random data");
            }
        }
    };

    public static void startKeepalive() {
        if (keepaliveExecutor != null && !keepaliveExecutor.isShutdown()) return;
        keepaliveRunning = true;
        keepaliveExecutor = Executors.newSingleThreadScheduledExecutor();
        keepaliveExecutor.scheduleAtFixedRate(keepaliveTask, 0, KEEPALIVE_INTERVAL, TimeUnit.SECONDS);
        System.out.println("[ATAPI-RNG] Keepalive started.");
    }

    public static void stopKeepalive() {
        keepaliveRunning = false;
        if (keepaliveExecutor != null) keepaliveExecutor.shutdownNow();
        System.out.println("[ATAPI-RNG] Keepalive stopped.");
    }

    public static void sendDataToServer(Object data) {
        byte[] bytes;
        if (data instanceof String) {
            bytes = ((String) data).getBytes();
        } else if (data instanceof byte[]) {
            bytes = (byte[]) data;
        } else {
            throw new IllegalArgumentException("Data must be String or byte[]");
        }
        connect();
        if (sio != null && sio.connected()) {
            sio.emit("message", bytes);
        } else {
            System.out.println("[ATAPI-RNG] Data send failed: not connected");
        }
    }

    public static void start() {
        connect();
        startKeepalive();
        startDiscardLoop();
    }

    public static String getRngStr() throws Exception {
        byte[] data = fetchRandomData();
        byte[] hashed = sha512(data);
        return bytesToHex(hashed);
    }

    public static java.math.BigInteger getRngNum() throws Exception {
        byte[] data = fetchRandomData();
        byte[] hashed = sha512(data);
        return new java.math.BigInteger(1, hashed); // 1 means positive
    }

    private static byte[] fetchRandomData() throws Exception {
        URL url = new URL("https://rng-api.atdevs.org/random");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        ByteArrayOutputStream bout = new ByteArrayOutputStream();
        try (InputStream in = conn.getInputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) bout.write(buf, 0, n);
        }
        return bout.toByteArray();
    }

    private static byte[] sha512(byte[] input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-512");
        return md.digest(input);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    // Discard buffer logic
    public static void discard(Object data) {
        byte[] bytes;
        if (data instanceof String) {
            bytes = ((String) data).getBytes();
        } else if (data instanceof byte[]) {
            bytes = (byte[]) data;
        } else {
            throw new IllegalArgumentException("Data must be String or byte[]");
        }
        discardLock.lock();
        try {
            discardBuffer.write(bytes, 0, bytes.length);
        } catch (IOException e) {
            // Shouldn't happen with ByteArrayOutputStream
        } finally {
            discardLock.unlock();
        }
    }

    private static Runnable discardTask = new Runnable() {
        @Override
        public void run() {
            connect();
            discardLock.lock();
            try {
                byte[] buf = discardBuffer.toByteArray();
                if (sio != null && sio.connected() && buf.length > 0) {
                    byte[] hashed = sha512(buf);
                    sio.emit("message", hashed);
                    System.out.printf("[DISCARD] Sent SHA-512 hash of %d bytes\n", buf.length);
                    discardBuffer.reset();
                }
            } catch (Exception e) {
                System.out.println("[DISCARD] Emit failed: " + e);
            } finally {
                discardLock.unlock();
            }
        }
    };

    public static void startDiscardLoop() {
        if (discardExecutor != null && !discardExecutor.isShutdown()) return;
        discardRunning = true;
        discardExecutor = Executors.newSingleThreadScheduledExecutor();
        discardExecutor.scheduleAtFixedRate(discardTask, 10, 10, TimeUnit.SECONDS);
        System.out.println("[ATAPI-RNG] Discard loop started.");
    }

    public static void stopDiscardLoop() {
        discardRunning = false;
        if (discardExecutor != null) discardExecutor.shutdownNow();
        System.out.println("[ATAPI-RNG] Discard loop stopped.");
    }
}
