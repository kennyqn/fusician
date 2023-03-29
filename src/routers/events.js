const path = require('path');
require('dotenv').config({ path: path.resolve('credentials.env') });

const express = require('express')
const router = new express.Router()
const axios = require('axios');
const getArtist = require('../helpers/getArtist')

const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
const defaultDate = '1970-01-01T00:00:00Z' // set date of event to start of epoch time for events that don't have a date

// GET /events
router.get('/events', async (req, res) => {
    let spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    try {
      const { city, radius, name } = req.query;
  
      let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${ticketmasterApiKey}&segmentId=KZFzniwnSyZfZ7v7nJ&sort=date,asc`;
  
      if (city) {
        url += `&city=${city}&radius=${radius || 50}`;
      }
  
      if (name) {
        url += `&keyword=${name}`;
      }
  
      const response = await axios.get(url);

      const artistIdsMap = new Map();
      const artistsMap = new Map();

      for (let i = 0; i < response.data._embedded.events.length; i++) {
        const event = response.data._embedded.events[i];
        const artistIds = await Promise.all(event._embedded.attractions.map(async (attraction) => {
          let artistName = attraction.name;
          const artistResponse = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
            headers: {
              'Authorization': `Bearer ${spotifyAccessToken}`
            }
          });
          return artistResponse.data.artists.items.length > 0 ? artistResponse.data.artists.items[0].id : null;
        }));
      
        const artistPromises = artistIds.map((artistId) => getArtist(artistId));
      
        const artists = await Promise.all(artistPromises);
        artistIdsMap.set(event.id, artistIds);
        artistsMap.set(event.id, artists);
      }

      const events = response.data._embedded.events.map((event) => {
        // TODO: Handle no attractions
        return {
          id: event.id,
          name: event.name,
          location: event._embedded.venues[0].name,
          date: event.dates.start.hasOwnProperty('dateTime')
          ? event.dates.start.dateTime
          : event.dates.start.localDate,
          imageUrl: event.images.length > 0 ? event.images[0].url : null,
          artists: artistsMap.get(event.id)
        }
      });
    
  
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
module.exports = router