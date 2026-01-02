// server/main.go - Testament Trustee: ULP v2.0 WebRTC Server
// Serves ULP records over libp2p WebRTC with QR code discovery
package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/libp2p/go-libp2p/p2p/transport/webrtc"
	"github.com/multiformats/go-multiaddr"
	"github.com/skip2/go-qrcode"
)

const (
	// ULP v2.0 Protocol
	ULPProtocol protocol.ID = "/ulp/2.0.0"

	// WebRTC signaling
	WebRTCProtocol protocol.ID = "/webrtc-signal/1.0.0"
)

// ULP Record types
type RID [32]byte

func (r RID) String() string {
	return hex.EncodeToString(r[:])
}

type Record struct {
	RID    RID
	Bytes  []byte
	Policy *PolicyMetadata
}

type PolicyMetadata struct {
	E8L        string   `json:"e8l"`
	E8R        string   `json:"e8r"`
	Chirality  string   `json:"chirality"`
	Projective string   `json:"projective"`
	Causality  string   `json:"causality"`
	Incidence  string   `json:"incidence"`
	Slots      []int    `json:"slots"`
}

// TestamentServer - ULP v2.0 WebRTC peer
type TestamentServer struct {
	host      host.Host
	records   map[RID]*Record
	traceDir  string
	httpPort  int

	// Connection info for QR codes
	peerID    peer.ID
	addrs     []multiaddr.Multiaddr
}

func NewTestamentServer(traceDir string, httpPort int) (*TestamentServer, error) {
	// Generate identity
	priv, _, err := crypto.GenerateKeyPairWithReader(crypto.Ed25519, 2048, rand.Reader)
	if err != nil {
		return nil, err
	}

	// Create libp2p host with WebRTC
	h, err := libp2p.New(
		libp2p.Identity(priv),
		libp2p.ListenAddrStrings(
			"/ip4/0.0.0.0/udp/9090/webrtc",
			"/ip6/::/udp/9090/webrtc",
		),
		libp2p.Transport(webrtc.New),
	)
	if err != nil {
		return nil, err
	}

	srv := &TestamentServer{
		host:     h,
		records:  make(map[RID]*Record),
		traceDir: traceDir,
		httpPort: httpPort,
		peerID:   h.ID(),
		addrs:    h.Addrs(),
	}

	// Register protocol handlers
	h.SetStreamHandler(ULPProtocol, srv.handleULPRequest)
	h.SetStreamHandler(WebRTCProtocol, srv.handleWebRTCSignal)

	log.Printf("Testament Trustee Server started")
	log.Printf("  Peer ID: %s", h.ID())
	log.Printf("  Addresses:")
	for _, addr := range h.Addrs() {
		log.Printf("    %s/p2p/%s", addr, h.ID())
	}

	return srv, nil
}

// handleULPRequest - Serve ULP v2.0 records
func (s *TestamentServer) handleULPRequest(stream network.Stream) {
	defer stream.Close()

	// Read request: ulp://<RID>
	buf := make([]byte, 1024)
	n, err := stream.Read(buf)
	if err != nil {
		log.Printf("Error reading ULP request: %v", err)
		return
	}

	request := strings.TrimSpace(string(buf[:n]))
	log.Printf("ULP request: %s", request)

	// Parse RID
	rid, err := parseULPURL(request)
	if err != nil {
		stream.Write([]byte(fmt.Sprintf("ERROR: %v\n", err)))
		return
	}

	// Fetch record
	record, exists := s.records[rid]
	if !exists {
		stream.Write([]byte("NOT_FOUND\n"))
		log.Printf("Record not found: %s", rid)
		return
	}

	// Send raw bytes (transport is semantics-blind)
	n, err = stream.Write(record.Bytes)
	if err != nil {
		log.Printf("Error sending record: %v", err)
		return
	}

	log.Printf("Served record %s (%d bytes)", rid, n)
}

// handleWebRTCSignal - WebRTC signaling for browser clients
func (s *TestamentServer) handleWebRTCSignal(stream network.Stream) {
	defer stream.Close()

	// Read signaling data
	buf := make([]byte, 4096)
	n, err := stream.Read(buf)
	if err != nil {
		log.Printf("Error reading WebRTC signal: %v", err)
		return
	}

	var signal map[string]interface{}
	if err := json.Unmarshal(buf[:n], &signal); err != nil {
		log.Printf("Error parsing signal: %v", err)
		return
	}

	log.Printf("WebRTC signal received: %v", signal["type"])

	// Echo back (simple signaling)
	response := map[string]interface{}{
		"type": "answer",
		"peerId": s.peerID.String(),
	}

	data, _ := json.Marshal(response)
	stream.Write(data)
}

// LoadRecords - Load ULP traces from directory
func (s *TestamentServer) LoadRecords() error {
	// Find all trace.log files
	pattern := filepath.Join(s.traceDir, "*/trace.log")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return err
	}

	for _, tracePath := range files {
		if err := s.loadRecord(tracePath); err != nil {
			log.Printf("Warning: could not load %s: %v", tracePath, err)
			continue
		}
	}

	log.Printf("Loaded %d records", len(s.records))
	return nil
}

func (s *TestamentServer) loadRecord(tracePath string) error {
	// Read trace
	bytes, err := os.ReadFile(tracePath)
	if err != nil {
		return err
	}

	// Compute RID
	hash := sha256.Sum256(bytes)
	rid := RID(hash)

	// Parse policy metadata
	policy, err := extractPolicy(bytes)
	if err != nil {
		log.Printf("Warning: no policy metadata in %s", tracePath)
		policy = nil
	}

	record := &Record{
		RID:    rid,
		Bytes:  bytes,
		Policy: policy,
	}

	s.records[rid] = record

	log.Printf("Loaded: %s (%d bytes)", rid, len(bytes))
	if policy != nil {
		log.Printf("  Chirality: %s, Geometry: %s/%s/%s",
			policy.Chirality, policy.Projective, policy.Causality, policy.Incidence)
	}

	return nil
}

// StartHTTPServer - Serve web UI and QR codes
func (s *TestamentServer) StartHTTPServer() error {
	http.HandleFunc("/", s.handleIndex)
	http.HandleFunc("/qr", s.handleQR)
	http.HandleFunc("/api/records", s.handleAPIRecords)
	http.HandleFunc("/api/record/", s.handleAPIRecord)
	http.HandleFunc("/api/connection", s.handleAPIConnection)

	addr := fmt.Sprintf(":%d", s.httpPort)
	log.Printf("HTTP server listening on http://localhost%s", addr)
	return http.ListenAndServe(addr, nil)
}

// handleIndex - Serve web UI
func (s *TestamentServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	html := `<!DOCTYPE html>
<html>
<head>
	<title>Testament Trustee - ULP v2.0 Browser</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		body { font-family: monospace; max-width: 1200px; margin: 40px auto; padding: 20px; }
		h1 { border-bottom: 2px solid #333; }
		.record { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
		.rid { color: #0066cc; font-weight: bold; }
		.policy { background: #f5f5f5; padding: 10px; margin: 10px 0; }
		.qr-code { text-align: center; margin: 20px 0; }
		button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
		#webauthn-status { padding: 10px; background: #ffffcc; margin: 10px 0; }
	</style>
</head>
<body>
	<h1>Testament Trustee - ULP v2.0 Browser</h1>

	<div class="qr-code">
		<h2>Scan to Connect</h2>
		<img id="qr" src="/qr" alt="Connection QR Code" />
		<p id="peer-id"></p>
	</div>

	<div id="webauthn-status" style="display:none;">
		<h3>Optional: WebAuthn Authentication</h3>
		<button onclick="registerWebAuthn()">Register Device</button>
		<button onclick="authenticateWebAuthn()">Authenticate</button>
		<span id="authn-result"></span>
	</div>

	<h2>Available Records</h2>
	<div id="records"></div>

	<script>
		// Load connection info
		fetch('/api/connection')
			.then(r => r.json())
			.then(data => {
				document.getElementById('peer-id').textContent = 'Peer ID: ' + data.peerId;
			});

		// Load records
		fetch('/api/records')
			.then(r => r.json())
			.then(records => {
				const container = document.getElementById('records');
				records.forEach(record => {
					const div = document.createElement('div');
					div.className = 'record';
					div.innerHTML = \`
						<div class="rid">ulp://\${record.rid}</div>
						<div>Size: \${record.size} bytes</div>
						\${record.policy ? \`
						<div class="policy">
							<strong>Policy:</strong><br/>
							Chirality: \${record.policy.chirality}<br/>
							Geometry: \${record.policy.projective} / \${record.policy.causality} / \${record.policy.incidence}<br/>
							Replica Slots: [\${record.policy.slots.join(', ')}]
						</div>
						\` : ''}
						<button onclick="verifyRecord('\${record.rid}')">Verify</button>
					\`;
					container.appendChild(div);
				});
			});

		function verifyRecord(rid) {
			fetch('/api/record/' + rid)
				.then(r => r.arrayBuffer())
				.then(async bytes => {
					// Compute SHA-256
					const hash = await crypto.subtle.digest('SHA-256', bytes);
					const hashHex = Array.from(new Uint8Array(hash))
						.map(b => b.toString(16).padStart(2, '0'))
						.join('');

					if (hashHex === rid) {
						alert('✓ Record verified! Hash matches RID.');
					} else {
						alert('✗ Verification failed! Hash mismatch.');
					}
				});
		}

		// WebAuthn (optional)
		function registerWebAuthn() {
			// Placeholder - implement WebAuthn registration
			document.getElementById('authn-result').textContent = 'WebAuthn registration (TODO)';
		}

		function authenticateWebAuthn() {
			// Placeholder - implement WebAuthn authentication
			document.getElementById('authn-result').textContent = 'WebAuthn auth (TODO)';
		}

		// Check if WebAuthn is available
		if (window.PublicKeyCredential) {
			document.getElementById('webauthn-status').style.display = 'block';
		}
	</script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

// handleQR - Generate QR code for connection
func (s *TestamentServer) handleQR(w http.ResponseWriter, r *http.Request) {
	// Create connection string
	connStr := fmt.Sprintf("%s/p2p/%s", s.addrs[0], s.peerID)

	// Generate QR code
	png, err := qrcode.Encode(connStr, qrcode.Medium, 256)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Write(png)
}

// handleAPIRecords - List all records
func (s *TestamentServer) handleAPIRecords(w http.ResponseWriter, r *http.Request) {
	type RecordInfo struct {
		RID    string          `json:"rid"`
		Size   int             `json:"size"`
		Policy *PolicyMetadata `json:"policy,omitempty"`
	}

	records := []RecordInfo{}
	for rid, record := range s.records {
		records = append(records, RecordInfo{
			RID:    rid.String(),
			Size:   len(record.Bytes),
			Policy: record.Policy,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

// handleAPIRecord - Fetch specific record
func (s *TestamentServer) handleAPIRecord(w http.ResponseWriter, r *http.Request) {
	ridStr := strings.TrimPrefix(r.URL.Path, "/api/record/")

	ridBytes, err := hex.DecodeString(ridStr)
	if err != nil || len(ridBytes) != 32 {
		http.Error(w, "Invalid RID", http.StatusBadRequest)
		return
	}

	var rid RID
	copy(rid[:], ridBytes)

	record, exists := s.records[rid]
	if !exists {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Write(record.Bytes)
}

// handleAPIConnection - Connection info
func (s *TestamentServer) handleAPIConnection(w http.ResponseWriter, r *http.Request) {
	info := map[string]interface{}{
		"peerId":    s.peerID.String(),
		"addresses": make([]string, len(s.addrs)),
	}

	for i, addr := range s.addrs {
		info["addresses"].([]string)[i] = addr.String()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

// Helpers
func parseULPURL(url string) (RID, error) {
	var rid RID
	url = strings.TrimPrefix(url, "ulp://")
	url = strings.TrimSpace(url)

	bytes, err := hex.DecodeString(url)
	if err != nil {
		return rid, fmt.Errorf("invalid RID hex: %v", err)
	}

	if len(bytes) != 32 {
		return rid, fmt.Errorf("invalid RID length: got %d, want 32", len(bytes))
	}

	copy(rid[:], bytes)
	return rid, nil
}

func extractPolicy(traceBytes []byte) (*PolicyMetadata, error) {
	policy := &PolicyMetadata{}
	lines := strings.Split(string(traceBytes), "\n")

	for _, line := range lines {
		fields := strings.Split(line, "\t")
		if len(fields) < 3 {
			continue
		}

		switch fields[0] {
		case "POLICY":
			if fields[1] == "e8l" {
				policy.E8L = fields[2]
			} else if fields[1] == "e8r" {
				policy.E8R = fields[2]
			} else if fields[1] == "chirality" {
				policy.Chirality = fields[2]
			}
		case "GEOMETRY":
			if fields[1] == "projective" {
				policy.Projective = fields[2]
			} else if fields[1] == "causality" {
				policy.Causality = fields[2]
			} else if fields[1] == "incidence" {
				policy.Incidence = fields[2]
			}
		case "REPLICA":
			if fields[1] == "slots" {
				slotsStr := strings.Join(fields[2:], "\t")
				json.Unmarshal([]byte(slotsStr), &policy.Slots)
			}
		}
	}

	if policy.E8L == "" {
		return nil, fmt.Errorf("no policy metadata")
	}

	return policy, nil
}

func main() {
	traceDir := flag.String("traces", "../v2/out", "Directory containing ULP traces")
	httpPort := flag.Int("port", 8080, "HTTP port for web UI")
	flag.Parse()

	// Create server
	srv, err := NewTestamentServer(*traceDir, *httpPort)
	if err != nil {
		log.Fatal(err)
	}

	// Load ULP records
	if err := srv.LoadRecords(); err != nil {
		log.Printf("Warning: %v", err)
	}

	// Start HTTP server (blocking)
	log.Fatal(srv.StartHTTPServer())
}
