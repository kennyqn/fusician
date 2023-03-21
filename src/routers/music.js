const path = require('path');
require('dotenv').config({ path: path.resolve('credentials.env') });

const express = require('express')
const router = new express.Router()
const axios = require('axios');

// GET /albums
router.get('/albums', async (req, res) => {
    let spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    try {
      const artistName = req.query.artist;
      const artistResponse = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });

      const artistId = artistResponse.data.artists.items[0].id;
      const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=50&market=US`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });

      const albums = albumsResponse.data.items.map(album => {
        return {
            name: album.name,
            url: album.external_urls.spotify,
            releaseDate: album.release_date,
            id: album.id,
            total_tracks: album.total_tracks,
            images: album.images
        }
      }
      );
      res.json({ albums });
    } catch (error) {
      console.error(error);
      console.error(error.response);
      res.status(error.response.status).send(error.message);
    }
  });

// GET /songs
router.get('/songs', async (req, res) => {
  let spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  try {
    const album = req.query.album;

    let songsResponse;


    const artistName = req.query.artist;
    const artistResponse = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`
      }
    });
    const artistId = artistResponse.data.artists.items[0].id;

    if (album) {
      songsResponse = await axios.get(`https://api.spotify.com/v1/albums/${album}/tracks`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });
    } else {
      songsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });
    }
    const songs = songsResponse.data.tracks.map(song => {
      return {
        id: song.id,
        name: song.name,
        url: song.external_urls.spotify,
        images: song.album.images,
        popularity: song.popularity
      };
    });

    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while retrieving songs.');
  }
});

// POST /create
router.post('/create', async (req, res) => {
    let spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    try {
      const playlistName = req.body.name;
      const songs = req.body.songs;
      const isPublic = req.body.public;
      const playlistDescription = req.body.description;
  
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });
      const userId = userResponse.data.id;
  
      const createPlaylistResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        name: playlistName,
        public: isPublic,
        description: playlistDescription
      }, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const playlistId = createPlaylistResponse.data.id;
  
      const addTracksResponse = await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        uris: songs.map(song => `spotify:track:${song}`)
      }, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
  
      res.json({
        message: `Playlist "${playlistName}" created successfully with ${songs.length} songs.`
      });
    } catch (error) {
      console.error(error);
      if (error.response.status === 401) {
        res.status(401).send('Unauthorized access.');
      } else {
        res.status(500).send('An error occurred while creating the playlist.');
      }
    }
  });

module.exports = router