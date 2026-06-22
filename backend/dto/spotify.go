package dto

type SpotifyStatusDTO struct {
	TrackName   string `json:"trackName"`
	ArtistName  string `json:"artistName"`
	AlbumName   string `json:"albumName"`
	ArtworkURL  string `json:"artworkUrl"`
	IsPlaying   bool   `json:"isPlaying"`
	PlaylistURL string `json:"playlistUrl"`
}

type SpotifyActionDTO struct {
	Action string `json:"action"` // "play", "pause", "next", "open"
}

type SpotifyPlaylistDTO struct {
	PlaylistURL string `json:"playlistUrl"`
}
