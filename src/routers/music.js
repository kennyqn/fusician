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

router.get('/search', async (req, res) => {
    try {
      const searchTerm = req.query.q;
      const artistResponse = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });
      const artists = artistResponse.data.artists.items;
      const artistPromises = artists.map(artist => getArtist(artist.id));

      const searchResults = await Promise.all(artistPromises);

      res.json(searchResults);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

// GET /artists endpoint handler - retrieve a list of search results for an artist name
router.get('/artist/:id', (req, res) => {
  const artistId = req.params.id;

  // Call the getArtist function to retrieve artist information
  getArtist(artistId)
    .then(artist => {
      // Retrieve additional information
      const monthlyListeners = artist.followers.total;
      const genres = artist.genres;
      const topTracks = artist.topTracks.tracks;
      const relatedArtists = artist.relatedArtists.artists;

      // Create the artist object with additional information
      const artistObject = {
        id: artist.id,
        name: artist.name,
        images: artist.images,
        popularity: artist.popularity,
        monthlyListeners: monthlyListeners,
        genres: genres,
        topTracks: topTracks,
        relatedArtists: relatedArtists
      };

      // Return the artist object as a JSON response
      res.json(artistObject);
    })
    .catch(error => {
      console.log(error);
      res.status(500).send('Error retrieving artist information');
    });
});


// helper function to retrieve additional artist meta data
async function getArtist(artistId) {
  const artistUrl = `https://api.spotify.com/v1/artists/${artistId}`;
  const topTracksUrl = `${artistUrl}/top-tracks?market=US`;
  const relatedArtistsUrl = `${artistUrl}/related-artists`;
  const headers = {
    headers: {
      'Authorization': `Bearer ${spotifyAccessToken}`,
    },
  }

  const artistResponse = await axios.get(artistUrl, headers);
  const topTracksResponse = await axios.get(topTracksUrl, headers);
  const relatedArtistsResponse = await axios.get(relatedArtistsUrl, headers);

  const artist = artistResponse.data;
  const topTracks = topTracksResponse.data.tracks;
  const relatedArtists = relatedArtistsResponse.data.artists;
  const genres = artist.genres;
  const monthlyListeners = artist.followers.total;
  const images = artist.images;

  return {
    id: artistId,
    name: artist.name,
    topTracks: topTracks,
    relatedArtists: relatedArtists,
    genres: genres,
    monthlyListeners: monthlyListeners,
    images: images,
  };
}

module.exports = router