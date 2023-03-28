const path = require('path');
require('dotenv').config({ path: path.resolve('credentials.env') });

const express = require('express')
const router = new express.Router()
const axios = require('axios');

const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
const defaultDate = '1970-01-01T00:00:00Z' // set date of event to start of epoch time for events that don't have a date

// GET /events
router.get('/events', async (req, res) => {
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
      const events = response.data._embedded.events.map((event) => ({
        id: event.id,
        name: event.name,
        location: event._embedded.venues[0].name,
        date: event.dates.start.hasOwnProperty('dateTime')
        ? event.dates.start.dateTime
        : event.dates.start.localDate,
        images: event.images,
        artists: event._embedded.hasOwnProperty('attractions')
        ? event._embedded.attractions.map((artist) => artist.name)
        : [event.name], // TODO: using event name if there is no list of artists provided but that is assuming the artist(s) name is in the event name (can we do better?)
      }));
  
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  
module.exports = router