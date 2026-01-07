// server/webauthn.go - WebAuthn implementation for ULP P2P Server
package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
)

// WebAuthnStore - In-memory credential storage
type WebAuthnStore struct {
	mu          sync.RWMutex
	users       map[string]*User
	sessions    map[string]*webauthn.SessionData
	credentials map[string]*webauthn.Credential
}

// User implements webauthn.User interface
type User struct {
	ID          []byte                    `json:"id"`
	Name        string                    `json:"name"`
	DisplayName string                    `json:"displayName"`
	Credentials []webauthn.Credential     `json:"credentials"`
}

func (u *User) WebAuthnID() []byte {
	return u.ID
}

func (u *User) WebAuthnName() string {
	return u.Name
}

func (u *User) WebAuthnDisplayName() string {
	return u.DisplayName
}

func (u *User) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}

func (u *User) WebAuthnIcon() string {
	return ""
}

// NewWebAuthnStore creates a new credential store
func NewWebAuthnStore() *WebAuthnStore {
	return &WebAuthnStore{
		users:       make(map[string]*User),
		sessions:    make(map[string]*webauthn.SessionData),
		credentials: make(map[string]*webauthn.Credential),
	}
}

// GetUser retrieves a user by name
func (s *WebAuthnStore) GetUser(name string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[name]
	if !exists {
		return nil, fmt.Errorf("user not found: %s", name)
	}

	return user, nil
}

// CreateUser creates a new user
func (s *WebAuthnStore) CreateUser(name, displayName string) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[name]; exists {
		return nil, fmt.Errorf("user already exists: %s", name)
	}

	id := make([]byte, 16)
	rand.Read(id)

	user := &User{
		ID:          id,
		Name:        name,
		DisplayName: displayName,
		Credentials: []webauthn.Credential{},
	}

	s.users[name] = user
	return user, nil
}

// AddCredential adds a credential to a user
func (s *WebAuthnStore) AddCredential(name string, cred webauthn.Credential) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[name]
	if !exists {
		return fmt.Errorf("user not found: %s", name)
	}

	user.Credentials = append(user.Credentials, cred)
	s.credentials[base64.URLEncoding.EncodeToString(cred.ID)] = &cred

	return nil
}

// GetSession retrieves a session
func (s *WebAuthnStore) GetSession(token string) (*webauthn.SessionData, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, exists := s.sessions[token]
	if !exists {
		return nil, fmt.Errorf("session not found")
	}

	return session, nil
}

// SaveSession stores a session
func (s *WebAuthnStore) SaveSession(token string, session *webauthn.SessionData) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.sessions[token] = session

	// Auto-cleanup after 5 minutes
	go func() {
		time.Sleep(5 * time.Minute)
		s.mu.Lock()
		delete(s.sessions, token)
		s.mu.Unlock()
	}()
}

// WebAuthnHandler handles WebAuthn HTTP endpoints
type WebAuthnHandler struct {
	webAuthn *webauthn.WebAuthn
	store    *WebAuthnStore
}

// NewWebAuthnHandler creates a new WebAuthn handler
func NewWebAuthnHandler(rpID, rpOrigin string) (*WebAuthnHandler, error) {
	wconfig := &webauthn.Config{
		RPDisplayName: "ULP P2P Server",
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	}

	web, err := webauthn.New(wconfig)
	if err != nil {
		return nil, err
	}

	return &WebAuthnHandler{
		webAuthn: web,
		store:    NewWebAuthnStore(),
	}, nil
}

// HandleRegisterBegin starts registration
func (h *WebAuthnHandler) HandleRegisterBegin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		DisplayName string `json:"displayName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get or create user
	user, err := h.store.GetUser(req.Username)
	if err != nil {
		user, err = h.store.CreateUser(req.Username, req.DisplayName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Start registration
	options, session, err := h.webAuthn.BeginRegistration(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate session token
	token := make([]byte, 32)
	rand.Read(token)
	sessionToken := base64.URLEncoding.EncodeToString(token)

	// Save session
	h.store.SaveSession(sessionToken, session)

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "webauthn-session",
		Value:    sessionToken,
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   300, // 5 minutes
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(options)
}

// HandleRegisterFinish completes registration
func (h *WebAuthnHandler) HandleRegisterFinish(w http.ResponseWriter, r *http.Request) {
	// Get session from cookie
	cookie, err := r.Cookie("webauthn-session")
	if err != nil {
		http.Error(w, "No session", http.StatusBadRequest)
		return
	}

	session, err := h.store.GetSession(cookie.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get username from session
	var req struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.store.GetUser(req.Username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Parse credential
	credential, err := h.webAuthn.FinishRegistration(user, *session, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Save credential
	if err := h.store.AddCredential(req.Username, *credential); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Registration complete",
	})
}

// HandleLoginBegin starts authentication
func (h *WebAuthnHandler) HandleLoginBegin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.store.GetUser(req.Username)
	if err != nil {
		http.Error(w, "User not found", http.StatusBadRequest)
		return
	}

	// Start authentication
	options, session, err := h.webAuthn.BeginLogin(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate session token
	token := make([]byte, 32)
	rand.Read(token)
	sessionToken := base64.URLEncoding.EncodeToString(token)

	// Save session
	h.store.SaveSession(sessionToken, session)

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "webauthn-session",
		Value:    sessionToken,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   300,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(options)
}

// HandleLoginFinish completes authentication
func (h *WebAuthnHandler) HandleLoginFinish(w http.ResponseWriter, r *http.Request) {
	// Get session from cookie
	cookie, err := r.Cookie("webauthn-session")
	if err != nil {
		http.Error(w, "No session", http.StatusBadRequest)
		return
	}

	session, err := h.store.GetSession(cookie.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get username
	var req struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.store.GetUser(req.Username)
	if err != nil {
		http.Error(w, "User not found", http.StatusBadRequest)
		return
	}

	// Verify assertion
	credential, err := h.webAuthn.FinishLogin(user, *session, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Update credential (sign count, etc.)
	h.store.AddCredential(req.Username, *credential)

	// Create auth token
	authToken := make([]byte, 32)
	rand.Read(authToken)
	authTokenStr := base64.URLEncoding.EncodeToString(authToken)

	// Set auth cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    authTokenStr,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   86400, // 24 hours
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"message": "Authentication complete",
		"user": req.Username,
	})
}

// RequireAuth middleware
func (h *WebAuthnHandler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("auth-token")
		if err != nil || cookie.Value == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// In production, verify the token
		next(w, r)
	}
}
