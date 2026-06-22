package models

type Config struct {
	ID                 int
	DurationSeconds    int
	SpotifyPlaylistURL string
}

type TimerState struct {
	ID            int
	Duration      int
	TimeRemaining int
	StartTime     int64
	IsRunning     int
}
