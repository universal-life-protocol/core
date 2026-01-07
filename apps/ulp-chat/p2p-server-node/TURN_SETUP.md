# Coturn quick setup

1) Install coturn (`apt install coturn` or equivalent).
2) Create `/etc/turnserver.conf` (or a local file) with:
```
listening-port=3478
fingerprint
realm=example.com
user=user:passwd84
lt-cred-mech
no-stdout-log
simple-log
```
3) Run:
```bash
sudo turnserver -c /etc/turnserver.conf --no-tls --no-dtls --listening-ip <PUBLIC_IP> --external-ip <PUBLIC_IP>
```
4) In `server.js`, set:
```
ICE_URLS="turn:<PUBLIC_IP>:3478,stun:stun.l.google.com:19302"
ICE_USERNAME="user"
ICE_PASSWORD="passwd84"
```

Security:
- Use a strong password and restrict to your network where possible.
- For production, enable TLS/DTLS on coturn and use short-lived credentials if you can.
