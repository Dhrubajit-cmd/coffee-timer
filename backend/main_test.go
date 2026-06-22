package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func TestTimerOperations(t *testing.T) {
	// Setup memory db
	var err error
	db, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open memory db: %v", err)
	}
	defer db.Close()

	// Initialize tables
	queries := []string{
		`CREATE TABLE IF NOT EXISTS config (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			duration_seconds INTEGER NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS timer_state (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			duration INTEGER NOT NULL,
			time_remaining INTEGER NOT NULL,
			start_time INTEGER NOT NULL,
			is_running INTEGER NOT NULL
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			t.Fatalf("Failed to create table query %q: %v", query, err)
		}
	}

	// Insert defaults
	_, _ = db.Exec("INSERT INTO config (id, duration_seconds) VALUES (1, 1500)")
	_, _ = db.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 1500, 1500, 0, 0)")

	// Test initial paused state
	state, err := getActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if state.IsRunning {
		t.Errorf("Expected timer to be paused")
	}
	if state.TimeRemaining != 1500 {
		t.Errorf("Expected 1500s remaining, got %d", state.TimeRemaining)
	}

	// Test starting the timer
	now := time.Now().Unix()
	_, _ = db.Exec("UPDATE timer_state SET is_running = 1, start_time = ?", now)
	state, err = getActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if !state.IsRunning {
		t.Errorf("Expected timer to be running")
	}

	// Test completed state
	_, _ = db.Exec("UPDATE timer_state SET is_running = 1, start_time = ?, time_remaining = 100", now-200)
	state, err = getActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if state.IsRunning {
		t.Errorf("Expected completed timer to stop running")
	}
	if state.TimeRemaining != 0 {
		t.Errorf("Expected remaining time 0, got %d", state.TimeRemaining)
	}
}

func TestConfigEndpoint(t *testing.T) {
	var err error
	db, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open memory db: %v", err)
	}
	defer db.Close()

	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS config (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		duration_seconds INTEGER NOT NULL
	);`)
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS timer_state (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		duration INTEGER NOT NULL,
		time_remaining INTEGER NOT NULL,
		start_time INTEGER NOT NULL,
		is_running INTEGER NOT NULL
	);`)
	_, _ = db.Exec("INSERT INTO config (id, duration_seconds) VALUES (1, 1500)")
	_, _ = db.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 1500, 1500, 0, 0)")

	// GET config
	req, _ := http.NewRequest("GET", "/api/config", nil)
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(handleConfig)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status: got %v want %v", status, http.StatusOK)
	}

	var cfg Config
	_ = json.NewDecoder(rr.Body).Decode(&cfg)
	if cfg.Duration != 1500 {
		t.Errorf("expected 1500, got %d", cfg.Duration)
	}

	// POST config
	body := `{"duration": 1800}`
	req, _ = http.NewRequest("POST", "/api/config", strings.NewReader(body))
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status: got %v want %v", status, http.StatusOK)
	}

	// Verify update in db
	var duration int
	_ = db.QueryRow("SELECT duration_seconds FROM config WHERE id = 1").Scan(&duration)
	if duration != 1800 {
		t.Errorf("Expected config update to 1800, got %d", duration)
	}
}
