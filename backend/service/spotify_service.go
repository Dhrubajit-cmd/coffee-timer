package service

import (
	"bytes"
	"os/exec"
	"strings"
	"coffee-timer/backend/models"
	"coffee-timer/backend/repository"
)

type SpotifyService struct {
	repo repository.TimerRepository
}

func NewSpotifyService(repo repository.TimerRepository) *SpotifyService {
	return &SpotifyService{repo: repo}
}

func (s *SpotifyService) GetPlaylistURL() (string, error) {
	cfg, err := s.repo.GetConfig()
	if err != nil {
		return "", err
	}
	return cfg.SpotifyPlaylistURL, nil
}

func (s *SpotifyService) UpdatePlaylistURL(playlistURL string) error {
	return s.repo.UpdateSpotifyPlaylist(playlistURL)
}

func (s *SpotifyService) GetStatus() (models.SpotifyTrack, error) {
	script := `
	if application "Spotify" is running then
		tell application "Spotify"
			try
				set pstate to player state as string
				set tname to name of current track
				set tartist to artist of current track
				set talbum to album of current track
				set tarturl to artwork url of current track
				return pstate & "||" & tname & "||" & tartist & "||" & talbum & "||" & tarturl
			on error
				return "running_stopped"
			end try
		end tell
	else
		return "not_running"
	end if
	`
	cmd := exec.Command("osascript", "-e", script)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return models.SpotifyTrack{IsPlaying: false, PlayerState: "error"}, nil
	}

	res := strings.TrimSpace(out.String())
	if res == "not_running" {
		return models.SpotifyTrack{IsPlaying: false, PlayerState: "not_running"}, nil
	}
	if res == "running_stopped" || res == "" {
		return models.SpotifyTrack{IsPlaying: false, PlayerState: "stopped"}, nil
	}

	parts := strings.Split(res, "||")
	if len(parts) < 5 {
		return models.SpotifyTrack{IsPlaying: false, PlayerState: "stopped"}, nil
	}

	isPlaying := parts[0] == "playing" || parts[0] == "kPSP"
	pstate := parts[0]
	if pstate == "kPSP" {
		pstate = "playing"
		isPlaying = true
	} else if pstate == "kPPa" {
		pstate = "paused"
		isPlaying = false
	} else if pstate == "kPSt" {
		pstate = "stopped"
		isPlaying = false
	}

	return models.SpotifyTrack{
		PlayerState: pstate,
		IsPlaying:   isPlaying,
		TrackName:   parts[1],
		ArtistName:  parts[2],
		AlbumName:   parts[3],
		ArtworkURL:  parts[4],
	}, nil
}

func (s *SpotifyService) TriggerAction(action string) error {
	var script string
	switch action {
	case "play":
		playlistURL, err := s.GetPlaylistURL()
		if err != nil || playlistURL == "" {
			script = `tell application "Spotify" to play`
		} else {
			uri := getSpotifyURI(playlistURL)
			script = `tell application "Spotify" to play track "` + uri + `"`
		}
	case "resume":
		script = `tell application "Spotify" to play`
	case "pause":
		script = `tell application "Spotify" to pause`
	case "next":
		script = `tell application "Spotify" to next track`
	case "open":
		script = `tell application "Spotify" to activate`
	default:
		return nil
	}

	cmd := exec.Command("osascript", "-e", script)
	return cmd.Run()
}

func getSpotifyURI(playlistURL string) string {
	playlistURL = strings.TrimSpace(playlistURL)
	if strings.HasPrefix(playlistURL, "spotify:") {
		return playlistURL
	}
	if idx := strings.Index(playlistURL, "/playlist/"); idx != -1 {
		idPart := playlistURL[idx+len("/playlist/"):]
		if qIdx := strings.Index(idPart, "?"); qIdx != -1 {
			idPart = idPart[:qIdx]
		}
		return "spotify:playlist:" + idPart
	}
	return playlistURL
}
