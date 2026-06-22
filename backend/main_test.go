package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"coffee-timer/backend/db"
	"coffee-timer/backend/dto"
	"coffee-timer/backend/handlers"
	"coffee-timer/backend/repository"
	"coffee-timer/backend/service"

	_ "modernc.org/sqlite"
)

func TestTimerOperations(t *testing.T) {
	// Setup memory db
	var err error
	db.DB, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open memory db: %v", err)
	}
	defer db.DB.Close()

	// Initialize tables
	queries := []string{
		`CREATE TABLE IF NOT EXISTS config (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			duration_seconds INTEGER NOT NULL,
			spotify_playlist_url TEXT NOT NULL
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
		if _, err := db.DB.Exec(query); err != nil {
			t.Fatalf("Failed to create table query %q: %v", query, err)
		}
	}

	// Insert defaults
	_, _ = db.DB.Exec("INSERT INTO config (id, duration_seconds, spotify_playlist_url) VALUES (1, 0, '')")
	_, _ = db.DB.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 0, 0, 0, 0)")

	repo := repository.NewSQLTimerRepository()
	svc := service.NewTimerService(repo, nil)

	// Test initial paused state
	state, err := svc.GetActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if state.IsRunning != 0 {
		t.Errorf("Expected timer to be paused")
	}
	if state.TimeRemaining != 0 {
		t.Errorf("Expected 0s remaining, got %d", state.TimeRemaining)
	}

	// Test updating config duration
	err = svc.UpdateConfig(1500)
	if err != nil {
		t.Fatalf("Failed to update config: %v", err)
	}

	// Now it should be set to 1500s
	state, err = svc.GetActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if state.TimeRemaining != 1500 {
		t.Errorf("Expected 1500s remaining after config update, got %d", state.TimeRemaining)
	}

	// Test starting the timer
	state, err = svc.StartResumeTimer()
	if err != nil {
		t.Fatalf("Failed to start timer: %v", err)
	}
	if state.IsRunning != 1 {
		t.Errorf("Expected timer to be running")
	}

	// Test completed state
	now := time.Now().Unix()
	_, _ = db.DB.Exec("UPDATE timer_state SET is_running = 1, start_time = ?, time_remaining = 100 WHERE id = 1", now-200)
	state, err = svc.GetActiveTimer()
	if err != nil {
		t.Fatalf("Failed to get active timer: %v", err)
	}
	if state.IsRunning != 0 {
		t.Errorf("Expected completed timer to stop running")
	}
	if state.TimeRemaining != 0 {
		t.Errorf("Expected remaining time 0, got %d", state.TimeRemaining)
	}
}

func TestConfigEndpoint(t *testing.T) {
	var err error
	db.DB, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open memory db: %v", err)
	}
	defer db.DB.Close()

	_, _ = db.DB.Exec(`CREATE TABLE IF NOT EXISTS config (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		duration_seconds INTEGER NOT NULL,
		spotify_playlist_url TEXT NOT NULL
	);`)
	_, _ = db.DB.Exec(`CREATE TABLE IF NOT EXISTS timer_state (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		duration INTEGER NOT NULL,
		time_remaining INTEGER NOT NULL,
		start_time INTEGER NOT NULL,
		is_running INTEGER NOT NULL
	);`)
	_, _ = db.DB.Exec("INSERT INTO config (id, duration_seconds, spotify_playlist_url) VALUES (1, 1500, '')")
	_, _ = db.DB.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 1500, 1500, 0, 0)")

	repo := repository.NewSQLTimerRepository()
	svc := service.NewTimerService(repo, nil)
	handler := handlers.NewTimerHandler(svc)

	// GET config
	req, _ := http.NewRequest("GET", "/api/config", nil)
	rr := httptest.NewRecorder()
	http.HandlerFunc(handler.HandleConfig).ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status: got %v want %v", status, http.StatusOK)
	}

	var cfg dto.ConfigDTO
	_ = json.NewDecoder(rr.Body).Decode(&cfg)
	if cfg.Duration != 1500 {
		t.Errorf("expected 1500, got %d", cfg.Duration)
	}

	// POST config
	body := `{"duration": 1800}`
	req, _ = http.NewRequest("POST", "/api/config", strings.NewReader(body))
	rr = httptest.NewRecorder()
	http.HandlerFunc(handler.HandleConfig).ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status: got %v want %v", status, http.StatusOK)
	}

	// Verify update in db
	var duration int
	_ = db.DB.QueryRow("SELECT duration_seconds FROM config WHERE id = 1").Scan(&duration)
	if duration != 1800 {
		t.Errorf("Expected config update to 1800, got %d", duration)
	}
}
