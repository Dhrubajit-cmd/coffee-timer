package main

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func initDB(filepath string) {
	var err error
	db, err = sql.Open("sqlite", filepath)
	if err != nil {
		log.Fatalf("Failed to open SQLite database: %v", err)
	}

	// Create tables if they do not exist
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
			log.Fatalf("Failed to create table query %q: %v", query, err)
		}
	}

	// Insert default config if empty (25 mins)
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM config").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query config count: %v", err)
	}
	if count == 0 {
		_, err = db.Exec("INSERT INTO config (id, duration_seconds) VALUES (1, 1500)")
		if err != nil {
			log.Fatalf("Failed to insert default config: %v", err)
		}
	}

	// Insert default timer_state if empty
	err = db.QueryRow("SELECT COUNT(*) FROM timer_state").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query timer_state count: %v", err)
	}
	if count == 0 {
		_, err = db.Exec("INSERT INTO timer_state (id, duration, time_remaining, start_time, is_running) VALUES (1, 1500, 1500, 0, 0)")
		if err != nil {
			log.Fatalf("Failed to insert default timer_state: %v", err)
		}
	}
}
