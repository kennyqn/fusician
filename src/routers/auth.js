const path = require('path');
require('dotenv').config({ path: path.resolve('credentials.env') });

const express = require('express')
const router = new express.Router()
const qs = require('querystring');
const axios = require('axios');

const spotifyClientId = process.env.SPOTIFY_API_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_API_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/callback';
const scope = 'playlist-modify-private playlist-modify-public';

// GET /login
router.get('/login', function(req, res) {

    // TODO: add state to add protection
    //var state = generateRandomString(16);
  
    res.redirect('https://accounts.spotify.com/authorize?' +
      qs.stringify({
        response_type: 'code',
        client_id: spotifyClientId,
        scope: scope,
        redirect_uri: redirectUri,
        // state: state
      }));
  });

// GET /callback
router.get('/callback', async function(req, res) {
    const { code } = req.query;
  
    // Exchange authorization code for access token
    try {
      const { data } = await axios({
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        params: {
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`
        }
      });

      const { access_token, refresh_token } = data;
      process.env.SPOTIFY_ACCESS_TOKEN = access_token
      spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN

      // Use access token to make authenticated requests to the Spotify API
      const { data: user } = await axios({
        url: 'https://api.spotify.com/v1/me',
        method: 'get',
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`
        }
      });
      
      res.send(`You have successfully logged in as ${user.display_name} (${user.id})!`);
    } catch (error) {
      console.error(error);
      res.status(400).send('Error logging in.');
    }
  });

module.exports = router