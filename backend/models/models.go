package models

type Config struct {
	ID              int
	DurationSeconds int
}

type TimerState struct {
	ID            int
	Duration      int
	TimeRemaining int
	StartTime     int64
	IsRunning     int
}
