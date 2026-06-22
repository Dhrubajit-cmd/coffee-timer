package repository

import (
	"coffee-timer/backend/db"
	"coffee-timer/backend/models"
)

type TimerRepository interface {
	GetConfig() (models.Config, error)
	UpdateConfig(durationSeconds int) error
	UpdateSpotifyPlaylist(playlistURL string) error
	GetTimerState() (models.TimerState, error)
	UpdateTimerState(state models.TimerState) error
}

type SQLTimerRepository struct{}

func NewSQLTimerRepository() TimerRepository {
	return &SQLTimerRepository{}
}

func (r *SQLTimerRepository) GetConfig() (models.Config, error) {
	var cfg models.Config
	err := db.DB.QueryRow("SELECT id, duration_seconds, spotify_playlist_url FROM config WHERE id = 1").Scan(
		&cfg.ID, &cfg.DurationSeconds, &cfg.SpotifyPlaylistURL,
	)
	return cfg, err
}

func (r *SQLTimerRepository) UpdateConfig(durationSeconds int) error {
	_, err := db.DB.Exec("UPDATE config SET duration_seconds = ? WHERE id = 1", durationSeconds)
	return err
}

func (r *SQLTimerRepository) UpdateSpotifyPlaylist(playlistURL string) error {
	_, err := db.DB.Exec("UPDATE config SET spotify_playlist_url = ? WHERE id = 1", playlistURL)
	return err
}

func (r *SQLTimerRepository) GetTimerState() (models.TimerState, error) {
	var state models.TimerState
	err := db.DB.QueryRow("SELECT id, duration, time_remaining, start_time, is_running FROM timer_state WHERE id = 1").Scan(
		&state.ID, &state.Duration, &state.TimeRemaining, &state.StartTime, &state.IsRunning,
	)
	return state, err
}

func (r *SQLTimerRepository) UpdateTimerState(state models.TimerState) error {
	_, err := db.DB.Exec("UPDATE timer_state SET duration = ?, time_remaining = ?, start_time = ?, is_running = ? WHERE id = 1",
		state.Duration, state.TimeRemaining, state.StartTime, state.IsRunning)
	return err
}
