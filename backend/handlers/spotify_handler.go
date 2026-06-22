package handlers

import (
	"encoding/json"
	"net/http"
	"coffee-timer/backend/dto"
	"coffee-timer/backend/service"
)

type SpotifyHandler struct {
	spotifyService *service.SpotifyService
}

func NewSpotifyHandler(svc *service.SpotifyService) *SpotifyHandler {
	return &SpotifyHandler{spotifyService: svc}
}

func (h *SpotifyHandler) HandleSpotifyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	track, err := h.spotifyService.GetStatus()
	if err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	playlistURL, err := h.spotifyService.GetPlaylistURL()
	if err != nil {
		playlistURL = ""
	}

	h.writeJSON(w, http.StatusOK, dto.SpotifyStatusDTO{
		TrackName:   track.TrackName,
		ArtistName:  track.ArtistName,
		AlbumName:   track.AlbumName,
		ArtworkURL:  track.ArtworkURL,
		IsPlaying:   track.IsPlaying,
		PlaylistURL: playlistURL,
	})
}

func (h *SpotifyHandler) HandleSpotifyAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req dto.SpotifyActionDTO
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	err = h.spotifyService.TriggerAction(req.Action)
	if err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

func (h *SpotifyHandler) HandleSpotifyPlaylist(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req dto.SpotifyPlaylistDTO
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	err = h.spotifyService.UpdatePlaylistURL(req.PlaylistURL)
	if err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

func (h *SpotifyHandler) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
