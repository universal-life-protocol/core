# Quick Start Guide

## Running locals-only (Day One)

### Method 1: Direct Browser (Simplest)

1. Open `ui/index.html` directly in your browser:
   ```bash
   # On most systems:
   open ui/index.html

   # Or in Termux/Android:
   termux-open-url file://$(pwd)/ui/index.html
   ```

2. The app will attempt to connect to the MQTT broker

**Note:** Some browsers block MQTT connections when opening files directly due to CORS. If this happens, use Method 2.

### Method 2: Local HTTP Server (Recommended)

1. Start a local web server:
   ```bash
   # Using Python (installed by default on most systems)
   python3 -m http.server 8080

   # Or using npm (if you have Node.js)
   npm start
   ```

2. Open your browser to: `http://localhost:8080/ui/`

3. You should see the locals-only marketplace interface

### Creating Your First Listing

1. In the text area, enter:
   ```
   type: listing
   title: Test Listing
   price: $10
   location: Local
   description: This is my first listing on locals-only
   timestamp: 2026-01-02T12:00:00Z
   ```

2. Click "Post Listing"

3. Your listing will be:
   - Canonicalized (normalized)
   - Hashed with SHA-256
   - Published to MQTT
   - Stored locally in IndexedDB
   - Rendered in the feed

### Viewing Listings

- All listings you create appear in the feed
- Listings from other users (if any are on the network) also appear
- Everything is verified via SHA-256 before display

### Troubleshooting

#### Can't connect to MQTT broker?

The default broker (`wss://test.mosquitto.org:8081`) is public and may be unavailable. Try:

1. Check the browser console for errors
2. Try an alternate broker by editing `client/main.js`:
   ```javascript
   const broker = "wss://broker.hivemq.com:8884";
   ```

3. Or run your own MQTT broker (see Advanced section)

#### Listings not appearing?

1. Open browser DevTools (F12)
2. Check the Console tab for errors
3. Check the Application tab → IndexedDB → locals-only → records

#### Browser compatibility?

locals-only requires:
- ES6+ JavaScript support
- Web Crypto API (for SHA-256)
- IndexedDB
- WebSocket support

All modern browsers (Chrome, Firefox, Safari, Edge) support these.

---

## Testing the CLI Tool

```bash
chmod +x tools/new-listing.sh
./tools/new-listing.sh
```

Follow the prompts to create a listing. Copy the output and paste into the web UI.

---

## What You Have Now

✅ Fully functional marketplace client
✅ Content-addressed, verifiable records
✅ MQTT-based global transport
✅ Local filtering and preferences
✅ No servers, no accounts, no backend

---

## Next Steps

1. **Customize your filters**: Edit `world/.ignore` and `world/.include`
2. **Adjust the view**: Edit `world/.view`
3. **Change the schema**: Edit `world/.schema`
4. **Deploy your own broker**: See Advanced guide

---

## Lock 1 · 2 · 3

You're now running a locals-only marketplace.

Global transport. Local meaning. Zero lock-in.
