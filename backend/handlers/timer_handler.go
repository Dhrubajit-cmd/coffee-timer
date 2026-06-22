package handlers

import (
	"encoding/json"
	"net/http"
	"coffee-timer/backend/dto"
	"coffee-timer/backend/service"
)

type TimerHandler struct {
	service *service.TimerService
}

func NewTimerHandler(svc *service.TimerService) *TimerHandler {
	return &TimerHandler{service: svc}
}

func (h *TimerHandler) HandleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		duration, err := h.service.GetConfig()
		if err != nil {
			h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		h.writeJSON(w, http.StatusOK, dto.ConfigDTO{Duration: duration})
		return
	}

	if r.Method == http.MethodPost {
		var req dto.ConfigDTO
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
			return
		}

		if req.Duration <= 0 {
			h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Duration must be positive"})
			return
		}

		err = h.service.UpdateConfig(req.Duration)
		if err != nil {
			h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		h.writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (h *TimerHandler) HandleTimer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	state, err := h.service.GetActiveTimer()
	if err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, dto.TimerStateDTO{
		Duration:      state.Duration,
		TimeRemaining: state.TimeRemaining,
		StartTime:     state.StartTime,
		IsRunning:     state.IsRunning == 1,
	})
}

func (h *TimerHandler) HandleTimerAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req dto.ActionRequestDTO
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	var state interface{}

	switch req.Action {
	case "start", "resume":
		s, err := h.service.StartResumeTimer()
		if err != nil {
			h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		state = dto.TimerStateDTO{
			Duration:      s.Duration,
			TimeRemaining: s.TimeRemaining,
			StartTime:     s.StartTime,
			IsRunning:     s.IsRunning == 1,
		}

	case "pause":
		s, err := h.service.PauseTimer()
		if err != nil {
			h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		state = dto.TimerStateDTO{
			Duration:      s.Duration,
			TimeRemaining: s.TimeRemaining,
			StartTime:     s.StartTime,
			IsRunning:     s.IsRunning == 1,
		}

	case "reset":
		s, err := h.service.ResetTimer()
		if err != nil {
			h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		state = dto.TimerStateDTO{
			Duration:      s.Duration,
			TimeRemaining: s.TimeRemaining,
			StartTime:     s.StartTime,
			IsRunning:     s.IsRunning == 1,
		}

	default:
		h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unknown action"})
		return
	}

	h.writeJSON(w, http.StatusOK, state)
}

func (h *TimerHandler) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
