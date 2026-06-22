package service

import (
	"time"
	"coffee-timer/backend/models"
	"coffee-timer/backend/repository"
)

type TimerService struct {
	repo       repository.TimerRepository
	spotifySvc *SpotifyService
}

func NewTimerService(repo repository.TimerRepository, spotifySvc *SpotifyService) *TimerService {
	return &TimerService{repo: repo, spotifySvc: spotifySvc}
}

func (s *TimerService) SetSpotifyService(spotifySvc *SpotifyService) {
	s.spotifySvc = spotifySvc
}

func (s *TimerService) GetConfig() (int, error) {
	cfg, err := s.repo.GetConfig()
	if err != nil {
		return 0, err
	}
	return cfg.DurationSeconds, nil
}

func (s *TimerService) UpdateConfig(duration int) error {
	err := s.repo.UpdateConfig(duration)
	if err != nil {
		return err
	}

	// Update active timer if not running
	state, err := s.repo.GetTimerState()
	if err == nil && state.IsRunning == 0 {
		state.Duration = duration
		state.TimeRemaining = duration
		_ = s.repo.UpdateTimerState(state)
	}
	return nil
}

func (s *TimerService) GetActiveTimer() (models.TimerState, error) {
	state, err := s.repo.GetTimerState()
	if err != nil {
		return state, err
	}

	if state.IsRunning == 1 {
		now := time.Now().Unix()
		elapsed := now - state.StartTime
		remaining := state.TimeRemaining - int(elapsed)

		if remaining <= 0 {
			// Finished
			state.TimeRemaining = 0
			state.StartTime = 0
			state.IsRunning = 0
			_ = s.repo.UpdateTimerState(state)
			if s.spotifySvc != nil {
				_ = s.spotifySvc.TriggerAction("pause")
			}
		} else {
			state.TimeRemaining = remaining
		}
	}

	return state, nil
}

func (s *TimerService) StartResumeTimer() (models.TimerState, error) {
	state, err := s.GetActiveTimer()
	if err != nil {
		return state, err
	}

	if state.IsRunning == 0 && state.TimeRemaining > 0 {
		state.IsRunning = 1
		state.StartTime = time.Now().Unix()
		err = s.repo.UpdateTimerState(state)
		if err == nil && s.spotifySvc != nil {
			if state.TimeRemaining == state.Duration {
				_ = s.spotifySvc.TriggerAction("play")
			} else {
				_ = s.spotifySvc.TriggerAction("resume")
			}
		}
	}

	return state, err
}

func (s *TimerService) PauseTimer() (models.TimerState, error) {
	state, err := s.repo.GetTimerState()
	if err != nil {
		return state, err
	}

	if state.IsRunning == 1 {
		now := time.Now().Unix()
		elapsed := now - state.StartTime
		remaining := state.TimeRemaining - int(elapsed)
		if remaining < 0 {
			remaining = 0
		}

		state.IsRunning = 0
		state.TimeRemaining = remaining
		state.StartTime = 0

		err = s.repo.UpdateTimerState(state)
		if err == nil && s.spotifySvc != nil {
			_ = s.spotifySvc.TriggerAction("pause")
		}
	}

	return state, err
}

func (s *TimerService) ResetTimer() (models.TimerState, error) {
	cfg, err := s.repo.GetConfig()
	if err != nil {
		return models.TimerState{}, err
	}

	var state models.TimerState
	state.IsRunning = 0
	state.StartTime = 0
	state.TimeRemaining = cfg.DurationSeconds
	state.Duration = cfg.DurationSeconds

	err = s.repo.UpdateTimerState(state)
	if err == nil && s.spotifySvc != nil {
		_ = s.spotifySvc.TriggerAction("pause")
	}
	return state, err
}
