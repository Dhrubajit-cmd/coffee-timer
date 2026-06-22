package dto

type ConfigDTO struct {
	Duration int `json:"duration"` // in seconds
}

type TimerStateDTO struct {
	Duration      int   `json:"duration"`      // total duration in seconds
	TimeRemaining int   `json:"timeRemaining"` // seconds remaining when paused/last updated
	StartTime     int64 `json:"startTime"`     // Unix timestamp when started, or 0 if paused
	IsRunning     bool  `json:"isRunning"`     // true if counting down
}

type ActionRequestDTO struct {
	Action string `json:"action"` // "start", "pause", "resume", "reset"
}
