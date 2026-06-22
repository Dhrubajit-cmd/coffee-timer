package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Config struct {
	Duration int `json:"duration"` // in seconds
}

type TimerState struct {
	Duration      int   `json:"duration"`      // total duration in seconds
	TimeRemaining int   `json:"timeRemaining"` // seconds remaining when paused/last updated
	StartTime     int64 `json:"startTime"`     // Unix timestamp when started, or 0 if paused
	IsRunning     bool  `json:"isRunning"`     // true if counting down
}

type ActionRequest struct {
	Action string `json:"action"` // "start", "pause", "resume", "reset"
}

func main() {
	// Initialize database
	initDB("coffee_timer.db")
	defer db.Close()

	// Register routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", handleConfig)
	mux.HandleFunc("/api/timer", handleTimer)
	mux.HandleFunc("/api/timer/action", handleTimerAction)

	// Wrap in CORS middleware
	handler := corsMiddleware(mux)

	port := 8080
	log.Printf("Starting backend server on port %d...", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), handler)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// JSON Helper
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(data)
	if err != nil {
		log.Printf("Failed to encode JSON: %v", err)
	}
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var duration int
		err := db.QueryRow("SELECT duration_seconds FROM config WHERE id = 1").Scan(&duration)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, Config{Duration: duration})
		return
	}

	if r.Method == http.MethodPost {
		var cfg Config
		err := json.NewDecoder(r.Body).Decode(&cfg)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
			return
		}

		if cfg.Duration <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Duration must be positive"})
			return
		}

		// Update database config
		_, err = db.Exec("UPDATE config SET duration_seconds = ? WHERE id = 1", cfg.Duration)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		// If the timer is NOT running, reset the active timer state to the new configuration
		var isRunningInt int
		err = db.QueryRow("SELECT is_running FROM timer_state WHERE id = 1").Scan(&isRunningInt)
		if err == nil && isRunningInt == 0 {
			_, _ = db.Exec("UPDATE timer_state SET duration = ?, time_remaining = ? WHERE id = 1", cfg.Duration, cfg.Duration)
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func getActiveTimer() (TimerState, error) {
	var state TimerState
	var isRunningInt int
	err := db.QueryRow("SELECT duration, time_remaining, start_time, is_running FROM timer_state WHERE id = 1").Scan(
		&state.Duration, &state.TimeRemaining, &state.StartTime, &isRunningInt,
	)
	if err != nil {
		return state, err
	}
	state.IsRunning = isRunningInt == 1

	if state.IsRunning {
		now := time.Now().Unix()
		elapsed := now - state.StartTime
		remaining := state.TimeRemaining - int(elapsed)

		if remaining <= 0 {
			// Timer has finished! Reset state to stopped at 0
			state.TimeRemaining = 0
			state.StartTime = 0
			state.IsRunning = false

			// Save stopped state to DB
			_, err = db.Exec("UPDATE timer_state SET time_remaining = 0, start_time = 0, is_running = 0 WHERE id = 1")
			if err != nil {
				log.Printf("Failed to save finished timer state: %v", err)
			}
		} else {
			state.TimeRemaining = remaining
		}
	}

	return state, nil
}

func handleTimer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	state, err := getActiveTimer()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, state)
}

func handleTimerAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req ActionRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Fetch current state
	state, err := getActiveTimer()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	now := time.Now().Unix()

	switch req.Action {
	case "start", "resume":
		if !state.IsRunning && state.TimeRemaining > 0 {
			state.IsRunning = true
			state.StartTime = now
			_, err = db.Exec("UPDATE timer_state SET is_running = 1, start_time = ? WHERE id = 1", now)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
		}

	case "pause":
		if state.IsRunning {
			elapsed := now - state.StartTime
			remaining := state.TimeRemaining - int(elapsed)
			if remaining < 0 {
				remaining = 0
			}

			state.IsRunning = false
			state.TimeRemaining = remaining
			state.StartTime = 0

			_, err = db.Exec("UPDATE timer_state SET is_running = 0, time_remaining = ?, start_time = 0 WHERE id = 1", remaining)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
		}

	case "reset":
		// Reset back to config duration
		var duration int
		err = db.QueryRow("SELECT duration_seconds FROM config WHERE id = 1").Scan(&duration)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		state.IsRunning = false
		state.StartTime = 0
		state.TimeRemaining = duration
		state.Duration = duration

		_, err = db.Exec("UPDATE timer_state SET is_running = 0, time_remaining = ?, duration = ?, start_time = 0 WHERE id = 1", duration, duration)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unknown action"})
		return
	}

	writeJSON(w, http.StatusOK, state)
}
