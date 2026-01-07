# ULP v2.0 P2P Server (Node.js)

Libp2p WebRTC peer with TURN/ICE support, serving ULP traces over HTTP and `/ulp/2.0.0`.

## Prereqs
- Node.js 18+
- Access to your TURN server (coturn)

## Install
```bash
cd "ulp v2.0/p2p-server-node"
npm install
```

## Run
```bash
# with TURN
ICE_URLS="turn:turn.example.com:3478,stun:stun.l.google.com:19302" \
ICE_USERNAME="user" \
ICE_PASSWORD="passwd84" \
node server.js --traces=../out --port=8080
```

Endpoints:
- `/api/records` — list RIDs/policy
- `/api/record/<RID>` — raw trace bytes
- `/api/projection/<RID>` — HTML modal cards (use `?fields=rid,chirality` to focus)
- `/api/projection-schema/<RID>` — JSON schema for modal cards
- `/api/connection` — peer ID and multiaddrs
- `/qr` — QR code of first multiaddr + peer ID

Smoke test (hash-check + connection info):
```bash
./test_smoke.sh
```

## TURN (coturn) quick setup
See `TURN_SETUP.md` for a minimal coturn config and run command. Use your public IP/port and matching credentials in `ICE_URLS/ICE_USERNAME/ICE_PASSWORD`.

## Production-style example (public IP + reverse proxy)

Assume:
- Public IP: `172.235.63.5`
- Domain: `universal-life-protocol.com`
- TURN credentials: `user` / `passwd84`

Run coturn (simplified; add TLS/DTLS for production):
```bash
sudo turnserver \
  --listening-ip 172.235.63.5 --external-ip 172.235.63.5 \
  --listening-port 3478 --fingerprint --realm universal-life-protocol.com \
  --lt-cred-mech --user user:passwd84 --no-tls --no-dtls --no-stdout-log
```

Start the Node peer pinned to UDP 9090:
```bash
cd "ulp v2.0/p2p-server-node"
ICE_URLS="turn:172.235.63.5:3478,stun:stun.l.google.com:19302" \
ICE_USERNAME="user" \
ICE_PASSWORD="passwd84" \
LISTEN="/ip4/0.0.0.0/udp/9090/webrtc" \
node server.js --traces=../out --port=8080
```

Nginx reverse proxy for HTTP UI/API (add TLS if desired):
```nginx
server {
  listen 80;
  server_name universal-life-protocol.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Verify:
- `curl http://universal-life-protocol.com/api/records` shows your RID(s).
- `BASE_URL=http://universal-life-protocol.com ./test_smoke.sh` reports “RID verified” and non-empty addresses from `/api/connection`.

## Notes
- WebRTC uses `@libp2p/webrtc` + `@libp2p/webrtc-direct`. TURN servers are injected via `iceServers`.
- Protocol handler `/ulp/2.0.0` serves trace bytes for `ulp://<RID>` requests.
- Default listen: `/ip4/0.0.0.0/udp/0/webrtc`; override with `--listen` or `LISTEN`.
