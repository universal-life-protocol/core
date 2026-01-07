// network/ulp_peer.go - ULP v2.0 libp2p implementation
// Implements: ulp://<RID> protocol for content-addressed record retrieval
package main

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
)

// ULP Protocol version
const ULPProtocol protocol.ID = "/ulp/2.0.0"

// Core types (SPEC 2.1, 2.2, 2.3)
type RID [32]byte   // sha256(record_bytes)
type WID [32]byte   // sha256(canonicalized_dotfiles)

func (r RID) String() string {
	return hex.EncodeToString(r[:])
}

func (r RID) URL() string {
	return fmt.Sprintf("ulp://%s", r.String())
}

// Record (POINT) - immutable truth, executed once
type Record struct {
	RID   RID
	Bytes []byte

	// Policy (derived, not stored)
	Policy *PolicyMetadata
}

// PolicyMetadata - derived from RID, never re-executed
type PolicyMetadata struct {
	E8L        string `json:"e8l"`
	E8R        string `json:"e8r"`
	Chirality  string `json:"chirality"`
	Projective string `json:"projective"`
	Causality  string `json:"causality"`
	Incidence  string `json:"incidence"`
	Slots      []int  `json:"slots"`
}

// WorldBall (BALL) - constraint interior
type WorldBall struct {
	WID      WID
	Dotfiles map[string][]byte
}

// ULP Peer - network node serving records
type ULPPeer struct {
	host    host.Host
	records map[RID]*Record
	worlds  map[WID]*WorldBall
	baseDir string
}

// NewULPPeer creates a new peer
func NewULPPeer(baseDir string) (*ULPPeer, error) {
	h, err := libp2p.New()
	if err != nil {
		return nil, err
	}

	peer := &ULPPeer{
		host:    h,
		records: make(map[RID]*Record),
		worlds:  make(map[WID]*WorldBall),
		baseDir: baseDir,
	}

	// Register ULP protocol handler
	h.SetStreamHandler(ULPProtocol, peer.handleULPStream)

	log.Printf("ULP Peer initialized")
	log.Printf("  Peer ID: %s", h.ID())
	log.Printf("  Addresses:")
	for _, addr := range h.Addrs() {
		log.Printf("    %s/p2p/%s", addr, h.ID())
	}

	return peer, nil
}

// handleULPStream implements the ULP protocol handler
// SPEC 7: End-to-end compliant flow
func (p *ULPPeer) handleULPStream(s network.Stream) {
	defer s.Close()

	// Read request: "ulp://<RID>"
	reader := bufio.NewReader(s)
	request, err := reader.ReadString('\n')
	if err != nil {
		log.Printf("Error reading request: %v", err)
		return
	}

	request = strings.TrimSpace(request)
	log.Printf("Received request: %s", request)

	// Parse RID from URL
	rid, err := ParseULPURL(request)
	if err != nil {
		s.Write([]byte(fmt.Sprintf("ERROR: %v\n", err)))
		return
	}

	// Fetch record (SPEC invariant: never re-execute)
	record, exists := p.records[rid]
	if !exists {
		s.Write([]byte("NOT_FOUND\n"))
		log.Printf("Record not found: %s", rid)
		return
	}

	// Send raw record bytes (transport is semantics-blind)
	n, err := s.Write(record.Bytes)
	if err != nil {
		log.Printf("Error sending record: %v", err)
		return
	}

	log.Printf("Served record %s (%d bytes)", rid, n)
}

// LoadRecord loads a trace file and creates a Record
func (p *ULPPeer) LoadRecord(tracePath string) (*Record, error) {
	// Read trace bytes
	bytes, err := os.ReadFile(tracePath)
	if err != nil {
		return nil, err
	}

	// Compute RID
	hash := sha256.Sum256(bytes)
	rid := RID(hash)

	// Parse policy metadata from trace
	policy, err := p.extractPolicyFromTrace(bytes)
	if err != nil {
		log.Printf("Warning: could not extract policy: %v", err)
		policy = nil
	}

	record := &Record{
		RID:    rid,
		Bytes:  bytes,
		Policy: policy,
	}

	// Store record
	p.records[rid] = record
	log.Printf("Loaded record: %s (%d bytes)", rid, len(bytes))

	if policy != nil {
		log.Printf("  Policy:")
		log.Printf("    E8L: %s", policy.E8L)
		log.Printf("    E8R: %s", policy.E8R)
		log.Printf("    Chirality: %s", policy.Chirality)
		log.Printf("    Geometry: %s / %s / %s", policy.Projective, policy.Causality, policy.Incidence)
		log.Printf("    Replica slots: %v", policy.Slots)
	}

	return record, nil
}

// extractPolicyFromTrace parses policy metadata from trace
func (p *ULPPeer) extractPolicyFromTrace(bytes []byte) (*PolicyMetadata, error) {
	policy := &PolicyMetadata{}
	lines := strings.Split(string(bytes), "\n")

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
				// Parse JSON array
				var slots []int
				slotsStr := strings.Join(fields[2:], "\t")
				if err := json.Unmarshal([]byte(slotsStr), &slots); err == nil {
					policy.Slots = slots
				}
			}
		}
	}

	if policy.E8L == "" || policy.E8R == "" {
		return nil, fmt.Errorf("missing policy metadata")
	}

	return policy, nil
}

// RouteToPeers applies causality-based routing order
// SPEC 3.3: Causality ladder for propagation
func (p *ULPPeer) RouteToPeers(rid RID, peers []peer.ID) []peer.ID {
	record, exists := p.records[rid]
	if !exists {
		return peers
	}

	ordered := make([]peer.ID, len(peers))
	copy(ordered, peers)

	// Apply chirality to ordering (SPEC 5.2: affects order only)
	if record.Policy != nil && record.Policy.Chirality == "RIGHT" {
		// Reverse for RIGHT chirality
		for i, j := 0, len(ordered)-1; i < j; i, j = i+1, j-1 {
			ordered[i], ordered[j] = ordered[j], ordered[i]
		}
	}

	// Additional causality-geometry-based ordering could be applied here
	// based on record.Policy.Causality

	return ordered
}

// AnnounceReplicaIntent announces which slots this peer intends to hold
// SPEC 3.4: Incidence ladder for replication without consensus
func (p *ULPPeer) AnnounceReplicaIntent(rid RID) []int {
	record, exists := p.records[rid]
	if !exists || record.Policy == nil {
		return nil
	}

	// Return deterministic slot indices (no voting, no quorum)
	return record.Policy.Slots
}

// ParseULPURL parses ulp://<RID> URLs
func ParseULPURL(url string) (RID, error) {
	var rid RID

	// Remove "ulp://" prefix
	url = strings.TrimPrefix(url, "ulp://")
	url = strings.TrimSpace(url)

	// Decode hex
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

// LoadWorld loads world dotfiles and computes WID
// SPEC 2.3: WorldBall canonicalization
func LoadWorld(worldDir string) (*WorldBall, error) {
	required := []string{
		".genesis", ".env", ".schema", ".atom", ".manifest",
		".sequence", ".include", ".ignore", ".interrupt",
		".procedure", ".view", ".record", ".symmetry",
	}

	dotfiles := make(map[string][]byte)

	for _, name := range required {
		path := filepath.Join(worldDir, name)
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("missing dotfile %s: %v", name, err)
		}
		dotfiles[name] = data
	}

	// Canonicalize and compute WID
	canonical := canonicalizeDotfiles(dotfiles)
	hash := sha256.Sum256(canonical)
	wid := WID(hash)

	return &WorldBall{
		WID:      wid,
		Dotfiles: dotfiles,
	}, nil
}

// canonicalizeDotfiles creates canonical representation
func canonicalizeDotfiles(files map[string][]byte) []byte {
	names := make([]string, 0, len(files))
	for name := range files {
		names = append(names, name)
	}
	sort.Strings(names)

	var result []byte
	for _, name := range names {
		result = append(result, []byte(name)...)
		result = append(result, '=')
		result = append(result, files[name]...)
		result = append(result, '\n')
	}

	return result
}

// CLI commands
func runExecute(worldDir, output string) error {
	cmd := exec.Command("./bin/run.sh", worldDir, output)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("ULP v2.0 Network Peer")
		fmt.Println()
		fmt.Println("Usage:")
		fmt.Println("  ulp_peer serve <trace_dir>     Start peer and serve traces")
		fmt.Println("  ulp_peer fetch <ulp://RID>     Fetch record from network")
		fmt.Println("  ulp_peer execute <world> <out> Execute and create trace")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "serve":
		if len(os.Args) < 3 {
			log.Fatal("Usage: ulp_peer serve <trace_dir>")
		}

		traceDir := os.Args[2]
		peer, err := NewULPPeer(".")
		if err != nil {
			log.Fatal(err)
		}

		// Load all traces in directory
		files, err := filepath.Glob(filepath.Join(traceDir, "*/trace.log"))
		if err != nil {
			log.Fatal(err)
		}

		for _, tracePath := range files {
			if _, err := peer.LoadRecord(tracePath); err != nil {
				log.Printf("Warning: could not load %s: %v", tracePath, err)
			}
		}

		log.Printf("Serving %d records", len(peer.records))
		log.Println("Press Ctrl+C to stop")

		// Block forever
		select {}

	case "fetch":
		if len(os.Args) < 3 {
			log.Fatal("Usage: ulp_peer fetch <ulp://RID>")
		}

		url := os.Args[2]
		rid, err := ParseULPURL(url)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("Fetching: %s\n", rid.URL())
		fmt.Println("(Network fetch not yet implemented - use 'serve' mode)")

	case "execute":
		if len(os.Args) < 4 {
			log.Fatal("Usage: ulp_peer execute <world> <out>")
		}

		worldDir := os.Args[2]
		outDir := os.Args[3]

		if err := runExecute(worldDir, outDir); err != nil {
			log.Fatal(err)
		}

	default:
		log.Fatalf("Unknown command: %s", command)
	}
}
