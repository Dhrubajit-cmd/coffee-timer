package main

import (
	"fmt"
	"log"
	"net/http"
	"coffee-timer/backend/db"
	"coffee-timer/backend/handlers"
	"coffee-timer/backend/middleware"
	"coffee-timer/backend/repository"
	"coffee-timer/backend/service"
)

func main() {
	// Initialize database
	db.InitDB("coffee_timer.db")
	defer db.DB.Close()

	// Setup clean architecture layers
	repo := repository.NewSQLTimerRepository()
	spotifySvc := service.NewSpotifyService(repo)
	svc := service.NewTimerService(repo, spotifySvc)
	handler := handlers.NewTimerHandler(svc)
	spotifyHandler := handlers.NewSpotifyHandler(spotifySvc)

	// Register routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", handler.HandleConfig)
	mux.HandleFunc("/api/timer", handler.HandleTimer)
	mux.HandleFunc("/api/timer/action", handler.HandleTimerAction)
	mux.HandleFunc("/api/spotify/status", spotifyHandler.HandleSpotifyStatus)
	mux.HandleFunc("/api/spotify/action", spotifyHandler.HandleSpotifyAction)
	mux.HandleFunc("/api/spotify/playlist", spotifyHandler.HandleSpotifyPlaylist)

	// Wrap in CORS middleware
	serverHandler := middleware.CorsMiddleware(mux)

	port := 8080
	log.Printf("Starting backend server on port %d...", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), serverHandler)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
