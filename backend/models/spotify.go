package models

type SpotifyTrack struct {
	TrackName   string `json:"trackName"`
	ArtistName  string `json:"artistName"`
	AlbumName   string `json:"albumName"`
	ArtworkURL  string `json:"artworkUrl"`
	IsPlaying   bool   `json:"isPlaying"`
	PlayerState string `json:"playerState"`
}
