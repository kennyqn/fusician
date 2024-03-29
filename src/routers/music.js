const path = require('path');
require('dotenv').config({ path: path.resolve('credentials.env') });

const express = require('express')
const router = new express.Router()
const axios = require('axios');
const getArtist = require('../helpers/getArtist')

const batchSize = 100

// GET /albums
router.get('/albums', async (req, res) => {
    let spotifyAccessToken = req.headers.authorization || process.env.SPOTIFY_ACCESS_TOKEN;
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
            imageUrl: album.images.length > 0 ? album.images[0].url : null
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
  let spotifyAccessToken = req.headers.authorization || process.env.SPOTIFY_ACCESS_TOKEN;
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
        imageUrl: song.album.images.length > 0 ? song.album.images[0].url : null,
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
  let spotifyAccessToken = req.headers.authorization || process.env.SPOTIFY_ACCESS_TOKEN;
  try {
      const playlistName = req.body.title;
      const isPublic = req.body.public || true;
      const playlistDescription = req.body.description;
      const artistIds = req.body.artists;
      const image = req.body.image;

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

      const trackUris = [];
      const addedTrackIds = new Set();

      for (let i = 0; i < artistIds.length; i++) {
          const artistId = artistIds[i].substring(2);
          const songOptions = artistIds[i].substring(0,1);
          var topTracks = false;
          var latestAlbum = false;
          if (songOptions.charAt(0) == "T") {
            topTracks = true;
          } else if (songOptions.charAt(0) == "L") {
            latestAlbum = true;
          } else if (songOptions.charAt(0) == "B") {
            topTracks = true;
            latestAlbum = true;
          } else {
            console.log("Found invalid option")
          }

          if (topTracks) {
            const tracksResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
              headers: {
                'Authorization': `Bearer ${spotifyAccessToken}`,
                'Content-Type': 'application/json'
            }
            });
            const newTracks = tracksResponse.data.tracks.filter(item => !addedTrackIds.has(item.id));
            trackUris.push(...newTracks.map(item => `spotify:track:${item.id}`));
            newTracks.forEach(item => addedTrackIds.add(item.id));
          }
          if (latestAlbum) {
            const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=1&include_groups=album&market=US`, {
                headers: {
                    'Authorization': `Bearer ${spotifyAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const albumId = albumsResponse.data.items[0].id;

            const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
                headers: {
                    'Authorization': `Bearer ${spotifyAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const newTracks = tracksResponse.data.items.filter(item => !addedTrackIds.has(item.id));
            trackUris.push(...newTracks.map(item => `spotify:track:${item.id}`));
            newTracks.forEach(item => addedTrackIds.add(item.id));
            }
          }

          const totalTracks = trackUris.length;
          let addedTracks = 0;
          while (addedTracks < totalTracks) {
            const batch = trackUris.slice(addedTracks, addedTracks + batchSize);
      
            const response = await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
              uris: batch
            }, {
              headers: {
                'Authorization': `Bearer ${spotifyAccessToken}`,
                'Content-Type': 'application/json'
              }
            });
      
            // Handle the response
            console.log(`Added ${batch.length} tracks to playlist`);
      
            addedTracks += batch.length;
          }
      if (typeof image !== 'undefined' && image) {
        await axios.put(`https://api.spotify.com/v1/playlists/${playlistId}/images`, image, {
          headers: {
              'Authorization': `Bearer ${spotifyAccessToken}`,
              'Content-Type': 'image/jpeg'
          }
      });

      }    
      

      res.json({
          message: `Playlist "${playlistName}" created successfully with ${trackUris.length} songs.`
      });
  } catch (error) {
      console.error(error);
      if (error.response && 'status' in error.response && error.response.status === 401) {
          console.log(error.response)
          res.status(401).send('Unauthorized access.');
      } else {
          res.status(500).send('An error occurred while creating the playlist.');
      }
  }
});


router.get('/search', async (req, res) => {
    let spotifyAccessToken = req.headers.authorization || process.env.SPOTIFY_ACCESS_TOKEN;
    try {
      const searchTerm = req.query.q;
      const artistResponse = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist`, {
        headers: {
          'Authorization': `Bearer ${spotifyAccessToken}`
        }
      });
      const artists = artistResponse.data.artists.items;
      const artistPromises = artists.map(artist => getArtist(artist.id, spotifyAccessToken));

      const searchResults = await Promise.all(artistPromises);

      res.json(searchResults);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

// GET /artist endpoint handler - retrieve information about an artist
router.get('/artists', async (req, res) => {
  let spotifyAccessToken = req.headers.authorization || process.env.SPOTIFY_ACCESS_TOKEN;
  const artists = req.query.artists.split(',');
  try {
      const artistPromises = artists.map(id => getArtist(id, spotifyAccessToken));

      const searchResults = await Promise.all(artistPromises);

      res.json(searchResults);
    }
  catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving artist information');
  }
});

module.exports = router;