const axios = require('axios');

// helper function to retrieve additional artist meta data
async function getArtist(artistId) {
    let spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
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
    const imageUrl = artist.images.length > 0 ? artist.images[0].url : null;
  
    return {
      id: artistId,
      name: artist.name,
      topTracks: topTracks,
      relatedArtists: relatedArtists,
      genres: genres,
      monthlyListeners: monthlyListeners,
      imageUrl: imageUrl,
    };
  }

module.exports = getArtist;