package db

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(filepath string) {
	var err error
	DB, err = sql.Open("sqlite", filepath)
	if err != nil {
		log.Fatalf("Failed to open SQLite database: %v", err)
	}

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
		if _, err := DB.Exec(query); err != nil {
			log.Fatalf("Failed to create table query %q: %v", query, err)
		}
	}

	// Insert default config if empty
	var count int
	err = DB.QueryRow("SELECT COUNT(*) FROM config").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query config count: %v", err)
	}
	if count == 0 {
		_, err = DB.Exec(`INSERT INTO config (id, duration_seconds, spotify_playlist_url) 
			VALUES (1, 0, 'https://open.spotify.com/playlist/5m8hWoxPvKRFRW2Oer7RGA?si=5657dccf138549d4')`)
		if err != nil {
			log.Fatalf("Failed to insert default config: %v", err)
		}
	}

	// Insert default timer_state if empty
	err = DB.QueryRow("SELECT COUNT(*) FROM timer_state").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query timer_state count: %v", err)
	}
	if count == 0 {
		_, err = DB.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 0, 0, 0, 0)")
		if err != nil {
			log.Fatalf("Failed to insert default timer_state: %v", err)
		}
	}
}
