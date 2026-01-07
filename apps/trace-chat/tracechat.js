const CHAT_DERIVATION_PATH = "m/44'/60'/999'/0/0";
const STORAGE_KEYS = {
    identity: "tracechat_identity_v2_hd",
    contacts: "tracechat_contacts_v2_hd",
    sessions: "tracechat_sessions_v2_hd"
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function nowIso() {
    return new Date().toISOString();
}

function normalizeAddress(address) {
    try {
        return ethers.getAddress(address);
    } catch (error) {
        return address;
    }
}

function computeSharedSecret(privateKey, publicKey) {
    if (typeof ethers.computeSharedSecret === "function") {
        return ethers.computeSharedSecret(privateKey, publicKey);
    }
    if (ethers.utils && typeof ethers.utils.computeSharedSecret === "function") {
        return ethers.utils.computeSharedSecret(privateKey, publicKey);
    }
    throw new Error("Shared secret computation not supported by ethers.");
}

class Storage {
    static loadIdentity() {
        const raw = localStorage.getItem(STORAGE_KEYS.identity);
        return raw ? JSON.parse(raw) : null;
    }

    static saveIdentity(identity) {
        localStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
    }

    static loadContacts() {
        const raw = localStorage.getItem(STORAGE_KEYS.contacts);
        return raw ? JSON.parse(raw) : [];
    }

    static saveContacts(contacts) {
        localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contacts));
    }

    static loadMessages(address) {
        const raw = localStorage.getItem(`tracechat_messages_${address}`);
        return raw ? JSON.parse(raw) : [];
    }

    static saveMessages(address, messages) {
        localStorage.setItem(`tracechat_messages_${address}`, JSON.stringify(messages));
    }

    static loadSessions() {
        const raw = localStorage.getItem(STORAGE_KEYS.sessions);
        return raw ? JSON.parse(raw) : [];
    }

    static saveSessions(sessions) {
        localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    }
}

class IdentityStore {
    static async encryptMnemonic(mnemonic, passphrase) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const baseKey = await crypto.subtle.importKey(
            "raw",
            textEncoder.encode(passphrase),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        const aesKey = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 150000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const encoded = textEncoder.encode(JSON.stringify({ mnemonic }));
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
        return {
            encrypted: true,
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            payload: bufferToBase64(ciphertext)
        };
    }

    static async decryptMnemonic(stored, passphrase) {
        const salt = base64ToBuffer(stored.salt);
        const iv = base64ToBuffer(stored.iv);
        const baseKey = await crypto.subtle.importKey(
            "raw",
            textEncoder.encode(passphrase),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        const aesKey = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: new Uint8Array(salt),
                iterations: 150000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            aesKey,
            base64ToBuffer(stored.payload)
        );
        return JSON.parse(textDecoder.decode(decrypted));
    }
}

class HDIdentity {
    constructor(mnemonic) {
        this.mnemonic = mnemonic;
        this.root = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic));
        this.chatRoot = this.root.derivePath(CHAT_DERIVATION_PATH);
        this.address = normalizeAddress(this.chatRoot.address);
        this.privateKey = this.chatRoot.privateKey;
        this.publicKey = this.chatRoot.publicKey;
    }

    static generate() {
        const wallet = ethers.HDNodeWallet.createRandom();
        return new HDIdentity(wallet.mnemonic.phrase);
    }

    static fromMnemonic(mnemonic) {
        const phrase = ethers.Mnemonic.fromPhrase(mnemonic);
        return new HDIdentity(phrase.phrase);
    }

    async deriveContactKey(address) {
        const index = await HDIdentity.addressToIndex(address);
        const node = this.chatRoot.derivePath(`m/0/${index}`);
        return {
            index,
            publicKey: node.publicKey,
            privateKey: node.privateKey
        };
    }

    async signMessage(message) {
        return this.chatRoot.signMessage(message);
    }

    static async addressToIndex(address) {
        const normalized = normalizeAddress(address).toLowerCase();
        const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(normalized));
        const view = new DataView(hash);
        const raw = view.getUint32(0, false);
        return raw % 2147483647;
    }
}

class HDCrypto {
    constructor(identity) {
        this.identity = identity;
        this.sessions = new Map();
        this.loadSessions();
    }

    loadSessions() {
        const stored = Storage.loadSessions();
        stored.forEach((session) => {
            this.sessions.set(session.address, session);
        });
    }

    persistSessions() {
        Storage.saveSessions(Array.from(this.sessions.values()));
    }

    ensureSession(address, contactPublicKey) {
        const normalized = normalizeAddress(address);
        const existing = this.sessions.get(normalized);
        if (existing) {
            if (contactPublicKey) {
                existing.contactPublicKey = contactPublicKey;
            }
            this.sessions.set(normalized, existing);
            this.persistSessions();
            return existing;
        }
        const session = {
            address: normalized,
            contactPublicKey: contactPublicKey || null,
            lastSent: 0,
            lastReceived: 0
        };
        this.sessions.set(normalized, session);
        this.persistSessions();
        return session;
    }

    async deriveMessageKey(address, counter) {
        const session = this.ensureSession(address, null);
        if (!session.contactPublicKey) {
            throw new Error("Missing contact public key.");
        }
        const contactKey = await this.identity.deriveContactKey(address);
        const sharedHex = computeSharedSecret(contactKey.privateKey, session.contactPublicKey);
        const sharedBytes = ethers.getBytes(sharedHex);
        const baseKey = await crypto.subtle.importKey(
            "raw",
            sharedBytes,
            "HKDF",
            false,
            ["deriveKey"]
        );
        const saltSource = [this.identity.address, session.address].sort().join("|");
        const salt = await crypto.subtle.digest("SHA-256", textEncoder.encode(saltSource));
        const info = textEncoder.encode(`tracechat-msg-${counter}`);
        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt,
                info
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(address, body) {
        const session = this.ensureSession(address, null);
        if (!session.contactPublicKey) {
            throw new Error("Missing contact public key.");
        }
        session.lastSent += 1;
        const counter = session.lastSent;
        const key = await this.deriveMessageKey(address, counter);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const payload = {
            body,
            timestamp: nowIso()
        };
        const encoded = textEncoder.encode(JSON.stringify(payload));
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        const payloadToSign = JSON.stringify({
            ct: bufferToBase64(ciphertext),
            iv: bufferToBase64(iv),
            counter,
            ts: payload.timestamp,
            from: this.identity.address
        });
        const signature = await this.identity.signMessage(payloadToSign);
        this.persistSessions();
        return {
            ct: bufferToBase64(ciphertext),
            iv: bufferToBase64(iv),
            counter,
            ts: payload.timestamp,
            sig: signature
        };
    }

    async decrypt(address, encryptedPayload) {
        const session = this.ensureSession(address, encryptedPayload.contactPublicKey);
        if (!session.contactPublicKey) {
            throw new Error("Missing contact public key.");
        }
        const payloadToVerify = JSON.stringify({
            ct: encryptedPayload.ct,
            iv: encryptedPayload.iv,
            counter: encryptedPayload.counter,
            ts: encryptedPayload.ts,
            from: address
        });
        const signer = normalizeAddress(ethers.verifyMessage(payloadToVerify, encryptedPayload.sig));
        if (signer !== normalizeAddress(address)) {
            throw new Error("Signature mismatch.");
        }
        if (encryptedPayload.counter <= session.lastReceived) {
            throw new Error("Replay detected.");
        }
        const key = await this.deriveMessageKey(address, encryptedPayload.counter);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(encryptedPayload.iv)) },
            key,
            base64ToBuffer(encryptedPayload.ct)
        );
        const payload = JSON.parse(textDecoder.decode(decrypted));
        session.lastReceived = encryptedPayload.counter;
        this.persistSessions();
        return payload;
    }
}

class P2PConnection {
    constructor(contact, signalSender, onMessage, onStatus) {
        this.contact = contact;
        this.signalSender = signalSender;
        this.onMessage = onMessage;
        this.onStatus = onStatus;
        this.peerConnection = null;
        this.dataChannel = null;
        this.pendingCandidates = [];
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:global.stun.twilio.com:3478" },
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject"
                }
            ],
            iceTransportPolicy: "all"
        });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signalSender({
                    type: "candidate",
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            this.onStatus(this.peerConnection.connectionState);
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
    }

    setupDataChannel() {
        if (!this.dataChannel) return;
        this.dataChannel.onopen = () => this.onStatus("connected");
        this.dataChannel.onclose = () => this.onStatus("closed");
        this.dataChannel.onmessage = (event) => {
            this.onMessage(event.data);
        };
    }

    async createOffer() {
        this.createPeerConnection();
        this.dataChannel = this.peerConnection.createDataChannel("tracechat");
        this.setupDataChannel();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async createOfferComplete() {
        this.createPeerConnection();
        this.dataChannel = this.peerConnection.createDataChannel("tracechat");
        this.setupDataChannel();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        await this.waitForIceComplete();
        return this.peerConnection.localDescription;
    }

    async acceptOffer(offer) {
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async acceptOfferComplete(offer) {
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        await this.waitForIceComplete();
        return this.peerConnection.localDescription;
    }

    async acceptAnswer(answer) {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(answer);
        await this.flushCandidates();
    }

    async addCandidate(candidate) {
        if (!this.peerConnection || !this.peerConnection.remoteDescription) {
            this.pendingCandidates.push(candidate);
            return;
        }
        await this.peerConnection.addIceCandidate(candidate);
    }

    async flushCandidates() {
        for (const candidate of this.pendingCandidates) {
            await this.peerConnection.addIceCandidate(candidate);
        }
        this.pendingCandidates = [];
    }

    waitForIceComplete() {
        if (!this.peerConnection) return Promise.resolve();
        if (this.peerConnection.iceGatheringState === "complete") {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const handler = () => {
                if (this.peerConnection.iceGatheringState === "complete") {
                    this.peerConnection.removeEventListener("icegatheringstatechange", handler);
                    resolve();
                }
            };
            this.peerConnection.addEventListener("icegatheringstatechange", handler);
        });
    }

    send(data) {
        if (this.dataChannel?.readyState === "open") {
            this.dataChannel.send(data);
        }
    }
}

class Discovery {
    constructor(identity, onSignal) {
        this.identity = identity;
        this.onSignal = onSignal;
        this.client = null;
        this.connected = false;
        this.topics = {
            presence: "tracechat/presence",
            discovery: "tracechat/discovery"
        };
    }

    rdvTopic(address) {
        return `tracechat/rdv/${normalizeAddress(address)}`;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const suffix = this.identity.address.slice(2, 10);
            this.client = new Paho.MQTT.Client(
                "wss://test.mosquitto.org:8081",
                `tracechat_${suffix}_${Math.random().toString(36).slice(2, 6)}`
            );

            this.client.onConnectionLost = () => {
                this.connected = false;
            };
            this.client.onMessageArrived = (message) => {
                this.handleMessage(message.destinationName, message.payloadString);
            };

            this.client.connect({
                useSSL: true,
                onSuccess: () => {
                    this.connected = true;
                    this.client.subscribe(this.topics.presence);
                    this.client.subscribe(this.topics.discovery);
                    this.client.subscribe(this.rdvTopic(this.identity.address));
                    this.announce();
                    resolve();
                },
                onFailure: reject
            });
        });
    }

    announce() {
        if (!this.connected) return;
        const presence = {
            t: Date.now(),
            address: this.identity.address,
            type: "hd-wallet"
        };
        this.publish(this.topics.presence, presence, 0);
    }

    async sendDiscoveryRequest(targetAddress, offer, contactPublicKey) {
        const request = {
            type: "discovery",
            target: normalizeAddress(targetAddress),
            from: this.identity.address,
            offer,
            contactPublicKey,
            timestamp: Date.now()
        };
        this.publish(this.topics.discovery, request, 1);
    }

    sendRendezvous(targetAddress, payload) {
        this.publish(this.rdvTopic(targetAddress), payload, 1);
    }

    publish(topic, data, qos = 0) {
        const message = new Paho.MQTT.Message(JSON.stringify(data));
        message.destinationName = topic;
        message.qos = qos;
        this.client.send(message);
    }

    handleMessage(topic, payload) {
        let parsed;
        try {
            parsed = JSON.parse(payload);
        } catch (error) {
            return;
        }

        if (topic === this.topics.discovery) {
            if (normalizeAddress(parsed.target) === this.identity.address) {
                this.onSignal("discovery", parsed);
            }
            return;
        }

        if (topic === this.rdvTopic(this.identity.address)) {
            this.onSignal("rendezvous", parsed);
        }
    }
}

class TraceChatApp {
    constructor() {
        this.identity = null;
        this.discovery = null;
        this.crypto = null;
        this.contacts = [];
        this.connections = new Map();
        this.currentView = "onboarding";
        this.activeContact = null;
        this.statusByAddress = {};
    }

    async init() {
        this.contacts = Storage.loadContacts();
        this.identity = await this.loadIdentity();
        if (this.identity) {
            this.crypto = new HDCrypto(this.identity);
            await this.startDiscovery();
            this.currentView = "main";
        }
        this.render();
    }

    async loadIdentity() {
        const stored = Storage.loadIdentity();
        if (!stored) return null;
        if (stored.encrypted) {
            const passphrase = prompt("Enter passphrase to unlock identity:");
            if (!passphrase) {
                alert("Passphrase required to unlock identity.");
                return null;
            }
            try {
                const decrypted = await IdentityStore.decryptMnemonic(stored.keyMaterial, passphrase);
                return HDIdentity.fromMnemonic(decrypted.mnemonic);
            } catch (error) {
                alert("Unable to decrypt identity.");
                return null;
            }
        }
        return HDIdentity.fromMnemonic(stored.keyMaterial.payload.mnemonic);
    }

    async saveIdentity(identity) {
        const passphrase = prompt("Set a passphrase to encrypt your seed (optional):") || "";
        let keyMaterial = {
            encrypted: false,
            payload: { mnemonic: identity.mnemonic }
        };
        if (passphrase) {
            keyMaterial = await IdentityStore.encryptMnemonic(identity.mnemonic, passphrase);
        }
        Storage.saveIdentity({
            address: identity.address,
            path: CHAT_DERIVATION_PATH,
            encrypted: keyMaterial.encrypted,
            keyMaterial
        });
    }

    async startDiscovery() {
        this.discovery = new Discovery(this.identity, (kind, payload) => {
            if (kind === "discovery") this.handleDiscovery(payload);
            if (kind === "rendezvous") this.handleRendezvous(payload);
        });
        try {
            await this.discovery.connect();
        } catch (error) {
            this.showAlert("MQTT connection failed. Retry or use manual exchange.");
        }
    }

    showAlert(message) {
        const alert = document.querySelector("[data-alert]");
        if (alert) {
            alert.textContent = message;
        }
    }

    render() {
        const root = document.querySelector("#app");
        if (!root) return;
        if (this.currentView === "onboarding") {
            root.innerHTML = this.renderOnboarding();
            this.bindOnboarding();
            return;
        }
        if (this.currentView === "chat" && this.activeContact) {
            root.innerHTML = this.renderChat(this.activeContact);
            this.bindChat(this.activeContact);
            return;
        }
        root.innerHTML = this.renderMain();
        this.bindMain();
    }

    renderHeader() {
        return `
            <header class="app-header">
                <div class="logo">Trace<span>Chat</span></div>
                <div class="pill">hd-wallet identity</div>
            </header>
        `;
    }

    renderOnboarding() {
        return `
            ${this.renderHeader()}
            <div class="panel">
                <h2>Chat with your HD wallet identity</h2>
                <p class="muted">Your seed phrase never leaves this browser.</p>
                <div class="grid">
                    <div class="panel">
                        <h3>Generate new identity</h3>
                        <p class="muted">Creates a 12-word seed phrase.</p>
                        <button class="cta" data-generate>Generate Seed Phrase</button>
                    </div>
                    <div class="panel">
                        <h3>Import seed phrase</h3>
                        <p class="muted">Use an existing 12/24 word phrase.</p>
                        <button class="cta secondary" data-import>Import Seed</button>
                    </div>
                </div>
                <div class="alert" data-alert>Write down your seed phrase. No recovery.</div>
            </div>
        `;
    }

    renderMain() {
        return `
            ${this.renderHeader()}
            <div class="panel">
                <div class="grid">
                    <div class="panel">
                        <h3>Your chat address</h3>
                        <div class="fingerprint">${this.identity.address}</div>
                        <p class="muted">Derivation path: ${CHAT_DERIVATION_PATH}</p>
                        <div class="qr-box" id="my-qr"></div>
                    </div>
                    <div class="panel">
                        <h3>Connect to contact</h3>
                        <div class="input-line">
                            <input type="text" placeholder="enter address" id="address-input" />
                            <button class="cta" data-connect>Connect</button>
                        </div>
                        <button class="cta secondary" data-scan>Scan QR</button>
                        <div class="alert" data-alert>Discovery uses MQTT rendezvous.</div>
                    </div>
                </div>
            </div>

            <div class="panel" style="margin-top: 24px;">
                <h3>Derivation trace</h3>
                ${this.renderDerivationTrace()}
            </div>

            <div class="panel" style="margin-top: 24px;">
                <h3>Manual offer/answer</h3>
                <p class="muted">Use this if MQTT is blocked. Exchange JSON blobs directly.</p>
                <div class="manual-grid">
                    <div>
                        <h4>Create offer</h4>
                        <textarea class="manual-textarea" id="manual-offer-output" placeholder="Offer JSON appears here"></textarea>
                        <button class="cta secondary" data-create-offer>Create Offer</button>
                    </div>
                    <div>
                        <h4>Accept offer</h4>
                        <textarea class="manual-textarea" id="manual-offer-input" placeholder="Paste offer JSON"></textarea>
                        <button class="cta secondary" data-accept-offer>Create Answer</button>
                        <textarea class="manual-textarea" id="manual-answer-output" placeholder="Answer JSON appears here"></textarea>
                    </div>
                    <div>
                        <h4>Accept answer</h4>
                        <textarea class="manual-textarea" id="manual-answer-input" placeholder="Paste answer JSON"></textarea>
                        <button class="cta secondary" data-accept-answer>Finalize</button>
                    </div>
                </div>
            </div>

            <div class="panel" style="margin-top: 24px;">
                <h3>Contacts</h3>
                <div class="contacts">
                    ${this.renderContacts()}
                </div>
            </div>
        `;
    }

    renderDerivationTrace() {
        const steps = [
            "Seed phrase created",
            "BIP-39 seed bytes derived",
            "m/44' (BIP-44 purpose)",
            "m/44'/60' (Ethereum)",
            "m/44'/60'/999' (chat purpose)",
            "m/44'/60'/999'/0 (account 0)",
            `m/44'/60'/999'/0/0 -> ${this.identity.address}`
        ];
        return `
            <div class="messages">
                ${steps.map((step, index) => `
                    <div class="message them">
                        <div>${step}</div>
                        <div class="muted" style="font-size: 11px;">Step ${index + 1}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderContacts() {
        if (!this.contacts.length) {
            return `<div class="muted">No contacts yet. Connect by address.</div>`;
        }
        return this.contacts.map((contact) => {
            const status = this.statusByAddress[contact.address] || "offline";
            const statusClass = status === "connected" ? "connected" : "disconnected";
            return `
                <div class="contact-card" data-contact="${contact.address}">
                    <div class="contact-meta">
                        <div class="fingerprint">${contact.address}</div>
                        <div class="status ${statusClass}">${status}</div>
                    </div>
                    <button class="cta secondary">Open</button>
                </div>
            `;
        }).join("");
    }

    renderChat(contact) {
        const messages = Storage.loadMessages(contact.address);
        return `
            ${this.renderHeader()}
            <div class="panel chat">
                <button class="cta secondary" data-back>Back</button>
                <div>
                    <div class="fingerprint">${contact.address}</div>
                    <div class="status ${this.statusByAddress[contact.address] === "connected" ? "connected" : "disconnected"}">
                        ${this.statusByAddress[contact.address] || "offline"}
                    </div>
                </div>
                <div class="messages" id="messages">
                    ${messages.map((msg) => this.renderMessage(msg)).join("")}
                </div>
                <div class="composer">
                    <textarea id="message-input" placeholder="Encrypted message..."></textarea>
                    <button class="cta" data-send>Send</button>
                </div>
                <div class="alert" data-alert>Messages are signed and encrypted per address.</div>
            </div>
        `;
    }

    renderMessage(message) {
        return `
            <div class="message ${message.sender === "me" ? "me" : "them"}">
                <div>${message.body}</div>
                <div class="muted" style="font-size: 11px;">${message.timestamp}</div>
            </div>
        `;
    }

    bindOnboarding() {
        document.querySelector("[data-generate]").addEventListener("click", async () => {
            const identity = HDIdentity.generate();
            alert(`Seed phrase (save this now):\n\n${identity.mnemonic}`);
            await this.saveIdentity(identity);
            this.identity = identity;
            this.crypto = new HDCrypto(this.identity);
            await this.startDiscovery();
            this.currentView = "main";
            this.render();
        });
        document.querySelector("[data-import]").addEventListener("click", async () => {
            const phrase = prompt("Enter your seed phrase:");
            if (!phrase) return;
            try {
                const identity = HDIdentity.fromMnemonic(phrase.trim());
                await this.saveIdentity(identity);
                this.identity = identity;
                this.crypto = new HDCrypto(this.identity);
                await this.startDiscovery();
                this.currentView = "main";
                this.render();
            } catch (error) {
                alert("Invalid seed phrase.");
            }
        });
    }

    bindMain() {
        this.renderMyQr();
        document.querySelector("[data-connect]").addEventListener("click", () => {
            const input = document.querySelector("#address-input");
            const address = input.value.trim();
            if (!address) return;
            this.connectToAddress(address);
        });
        document.querySelector("[data-scan]").addEventListener("click", () => {
            this.scanQr();
        });
        document.querySelector("[data-create-offer]").addEventListener("click", () => {
            this.createManualOffer();
        });
        document.querySelector("[data-accept-offer]").addEventListener("click", () => {
            this.acceptManualOffer();
        });
        document.querySelector("[data-accept-answer]").addEventListener("click", () => {
            this.acceptManualAnswer();
        });
        document.querySelectorAll("[data-contact]").forEach((element) => {
            element.addEventListener("click", () => {
                const address = element.getAttribute("data-contact");
                this.openChat(address);
            });
        });
    }

    bindChat(contact) {
        document.querySelector("[data-back]").addEventListener("click", () => {
            this.currentView = "main";
            this.activeContact = null;
            this.render();
        });
        document.querySelector("[data-send]").addEventListener("click", () => {
            this.sendChatMessage(contact.address);
        });
    }

    async renderMyQr() {
        const container = document.querySelector("#my-qr");
        if (!container) return;
        container.innerHTML = "";
        const writer = new ZXing.BrowserQRCodeSvgWriter();
        const payload = JSON.stringify({
            address: this.identity.address
        });
        const svg = writer.write(payload, 180, 180);
        container.appendChild(svg);
    }

    async scanQr() {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(3, 5, 8, 0.85)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "999";
        overlay.innerHTML = `
            <div style="background:#0c1218;padding:16px;border-radius:12px;border:1px solid #243040;max-width:360px;width:90%;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>Scan QR</strong>
                    <button class="cta secondary" data-close>Close</button>
                </div>
                <video id="qr-video" style="width:100%;margin-top:12px;border-radius:10px;"></video>
                <p class="muted" style="margin-top:10px;">Point your camera at a TraceChat QR.</p>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector("[data-close]").addEventListener("click", () => {
            document.body.removeChild(overlay);
        });

        try {
            const reader = new ZXing.BrowserQRCodeReader();
            const video = overlay.querySelector("#qr-video");
            reader.decodeFromVideoDevice(undefined, video, (result) => {
                if (!result) return;
                const data = JSON.parse(result.text);
                if (data.address) {
                    const input = document.querySelector("#address-input");
                    if (input) input.value = data.address;
                }
                reader.reset();
                document.body.removeChild(overlay);
            });
        } catch (error) {
            this.showAlert("QR scan failed or was cancelled.");
            document.body.removeChild(overlay);
        }
    }

    upsertContact(address, updates) {
        const normalized = normalizeAddress(address);
        const existing = this.contacts.find((contact) => contact.address === normalized);
        if (existing) {
            Object.assign(existing, updates);
        } else {
            this.contacts.push({
                address: normalized,
                publicKey: updates.publicKey || null,
                createdAt: nowIso()
            });
        }
        Storage.saveContacts(this.contacts);
    }

    async connectToAddress(address) {
        const normalized = normalizeAddress(address);
        this.upsertContact(normalized, {});
        const contact = this.contacts.find((c) => c.address === normalized);
        const connection = this.getOrCreateConnection(contact);
        const contactKey = await this.identity.deriveContactKey(normalized);
        this.crypto.ensureSession(normalized, contact.publicKey || null);
        const offer = await connection.createOffer();
        await this.discovery.sendDiscoveryRequest(normalized, offer, contactKey.publicKey);
        this.statusByAddress[normalized] = "connecting";
        this.render();
    }

    async createManualOffer() {
        const input = document.querySelector("#address-input");
        const targetAddress = input.value.trim();
        if (!targetAddress) {
            this.showAlert("Enter a target address before creating an offer.");
            return;
        }
        const normalized = normalizeAddress(targetAddress);
        this.upsertContact(normalized, {});
        const contact = this.contacts.find((c) => c.address === normalized);
        const connection = this.getOrCreateConnection(contact);
        const contactKey = await this.identity.deriveContactKey(normalized);
        this.crypto.ensureSession(normalized, contact.publicKey || null);
        const offer = await connection.createOfferComplete();
        const payload = {
            type: "offer",
            from: this.identity.address,
            target: normalized,
            sdp: offer,
            contactPublicKey: contactKey.publicKey
        };
        const output = document.querySelector("#manual-offer-output");
        output.value = JSON.stringify(payload, null, 2);
        this.statusByAddress[normalized] = "connecting";
        this.render();
    }

    async acceptManualOffer() {
        const input = document.querySelector("#manual-offer-input");
        if (!input.value.trim()) return;
        let payload;
        try {
            payload = JSON.parse(input.value);
        } catch (error) {
            this.showAlert("Invalid offer JSON.");
            return;
        }
        if (payload.type !== "offer" || !payload.from || !payload.sdp) {
            this.showAlert("Offer JSON missing fields.");
            return;
        }
        const fromAddress = normalizeAddress(payload.from);
        this.upsertContact(fromAddress, { publicKey: payload.contactPublicKey || null });
        if (payload.contactPublicKey) {
            this.crypto.ensureSession(fromAddress, payload.contactPublicKey);
        }
        const contact = this.contacts.find((c) => c.address === fromAddress);
        const connection = this.getOrCreateConnection(contact);
        const answer = await connection.acceptOfferComplete(payload.sdp);
        const myContactKey = await this.identity.deriveContactKey(fromAddress);
        const answerPayload = {
            type: "answer",
            from: this.identity.address,
            target: fromAddress,
            sdp: answer,
            contactPublicKey: myContactKey.publicKey
        };
        const output = document.querySelector("#manual-answer-output");
        output.value = JSON.stringify(answerPayload, null, 2);
        this.statusByAddress[fromAddress] = "connecting";
        this.render();
    }

    async acceptManualAnswer() {
        const input = document.querySelector("#manual-answer-input");
        if (!input.value.trim()) return;
        let payload;
        try {
            payload = JSON.parse(input.value);
        } catch (error) {
            this.showAlert("Invalid answer JSON.");
            return;
        }
        if (payload.type !== "answer" || !payload.from || !payload.sdp) {
            this.showAlert("Answer JSON missing fields.");
            return;
        }
        if (payload.target && normalizeAddress(payload.target) !== this.identity.address) {
            this.showAlert("Answer target does not match this identity.");
            return;
        }
        const fromAddress = normalizeAddress(payload.from);
        this.upsertContact(fromAddress, { publicKey: payload.contactPublicKey || null });
        if (payload.contactPublicKey) {
            this.crypto.ensureSession(fromAddress, payload.contactPublicKey);
        }
        const contact = this.contacts.find((c) => c.address === fromAddress);
        const connection = this.getOrCreateConnection(contact);
        await connection.acceptAnswer(payload.sdp);
        this.statusByAddress[fromAddress] = "connecting";
        this.render();
    }

    getOrCreateConnection(contact) {
        if (this.connections.has(contact.address)) {
            return this.connections.get(contact.address);
        }
        const connection = new P2PConnection(
            contact,
            (payload) => this.discovery.sendRendezvous(contact.address, {
                type: "signal",
                from: this.identity.address,
                target: contact.address,
                payload
            }),
            (data) => this.handleIncomingData(contact.address, data),
            (status) => {
                this.statusByAddress[contact.address] = status;
                this.render();
            }
        );
        this.connections.set(contact.address, connection);
        return connection;
    }

    async handleDiscovery(request) {
        const fromAddress = normalizeAddress(request.from);
        this.upsertContact(fromAddress, {
            publicKey: request.contactPublicKey || null
        });
        const contact = this.contacts.find((c) => c.address === fromAddress);
        if (request.contactPublicKey) {
            this.crypto.ensureSession(fromAddress, request.contactPublicKey);
        }
        const connection = this.getOrCreateConnection(contact);
        const answer = await connection.acceptOffer(request.offer);
        const myContactKey = await this.identity.deriveContactKey(fromAddress);
        this.discovery.sendRendezvous(fromAddress, {
            type: "answer",
            from: this.identity.address,
            target: fromAddress,
            answer,
            contactPublicKey: myContactKey.publicKey
        });
        this.statusByAddress[fromAddress] = "connecting";
        this.render();
    }

    async handleRendezvous(payload) {
        if (!payload || normalizeAddress(payload.target) !== this.identity.address) return;
        const fromAddress = normalizeAddress(payload.from);
        const contact = this.contacts.find((c) => c.address === fromAddress);
        if (!contact) {
            this.upsertContact(fromAddress, { publicKey: payload.contactPublicKey || null });
        } else if (payload.contactPublicKey) {
            contact.publicKey = payload.contactPublicKey;
            Storage.saveContacts(this.contacts);
        }
        if (payload.contactPublicKey) {
            this.crypto.ensureSession(fromAddress, payload.contactPublicKey);
        }
        const connection = this.getOrCreateConnection(contact || this.contacts.find((c) => c.address === fromAddress));
        if (payload.type === "answer") {
            await connection.acceptAnswer(payload.answer);
        }
        if (payload.type === "signal" && payload.payload?.type === "candidate") {
            await connection.addCandidate(payload.payload.candidate);
        }
    }

    async handleIncomingData(address, raw) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return;
        }
        if (parsed.kind !== "msg") return;
        try {
            const payload = await this.crypto.decrypt(address, parsed.payload);
            this.storeMessage(address, {
                sender: "them",
                body: payload.body,
                timestamp: payload.timestamp
            });
            if (this.currentView === "chat" && this.activeContact?.address === address) {
                this.render();
            }
        } catch (error) {
            this.showAlert("Failed to decrypt message.");
        }
    }

    async sendChatMessage(address) {
        const input = document.querySelector("#message-input");
        const body = input.value.trim();
        if (!body) return;
        const contact = this.contacts.find((c) => c.address === normalizeAddress(address));
        if (!contact || !contact.publicKey) {
            this.showAlert("Missing contact key. Ask them to reconnect.");
            return;
        }
        this.crypto.ensureSession(contact.address, contact.publicKey);
        const payload = await this.crypto.encrypt(contact.address, body);
        const connection = this.getOrCreateConnection(contact);
        connection.send(JSON.stringify({
            kind: "msg",
            payload
        }));
        this.storeMessage(contact.address, {
            sender: "me",
            body,
            timestamp: payload.ts
        });
        input.value = "";
        this.render();
    }

    storeMessage(address, message) {
        const messages = Storage.loadMessages(address);
        messages.push(message);
        Storage.saveMessages(address, messages);
    }

    openChat(address) {
        this.activeContact = this.contacts.find((c) => c.address === normalizeAddress(address));
        this.currentView = "chat";
        this.render();
    }
}

const app = new TraceChatApp();
window.tracechat = app;

window.addEventListener("DOMContentLoaded", () => {
    app.init();
});
