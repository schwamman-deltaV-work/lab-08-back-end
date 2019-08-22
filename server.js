'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const superagent = require('superagent');
const pg = require('pg');

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

const app = express();
app.use(cors());

function convertTime(timeInMilliseconds) {
  return new Date(timeInMilliseconds).toString().split(' ').slice(0, 4).join(' ');
}

function Location(query, formatted, lat, long) {
  this.search_query = query;
  this.formatted_query = formatted;
  this.latitude = lat;
  this.longitude = long;
}

function Weather(weatherData) {
  this.forecast = weatherData.summary;
  this.time = convertTime(weatherData.time * 1000);
}

function Event(url, name, date, summary) {
  this.link = url;
  this.name = name;
  this.event_date = date;
  this.summary = summary;
}

function handleError(error, response) {
  response.status(error.status || 500).send(error.message);
}

// function select(table, column, value){
//   const SQL = `SELECT * FROM ${table} WHERE ${column}=$1`;
//   const VALUES = [value]
// }


app.get('/location', (request, response) => {
  const query = 'SELECT * FROM locations WHERE search_query=$1;';
  const values = [request.query.data];

  client.query(query, values).then(results => {
    if (results.rows.length === 0) {
      superagent
        .get(`https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`)
        .then((locationData) => {
          const location = new Location(request.query.data, locationData.body.results[0].formatted_address, locationData.body.results[0].geometry.location.lat, locationData.body.results[0].geometry.location.lng);
          const query = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
          const values = Object.values(location);
          console.log(values);
          client.query(query, values).catch((...args) => console.log(args));
          console.log('sent from api');
          response.send(location);
        })
        .catch((error) => handleError(error, response));
    } else {
      console.log('sent from db');
      response.send(results.rows[0]);
    }
  }).catch(error => console.log(error));
});

app.get('/events', (request, response) => {
  const query = 'SELECT * FROM events WHERE link=$1;';
  const values = [request.query.data.search_query];

  client.query(query, values).then(results => {
    if (results.rows.length === 0) {
      superagent
        .get(`https://www.eventbriteapi.com/v3/events/search/?token=${process.env.EVENTBRITE_API_KEY}&location.latitude=${request.query.data.latitude}&location.longitude=${request.query.data.longitude}&location.within=10km`)
        .then((eventData) => {
          const sliceIndex = eventData.body.events.length > 20 ? 20 : eventData.body.events.length;
          const events = eventData.body.events.slice(0, sliceIndex).map((event) => new Event(event.url, event.name.text, event.start.local, event.description.text));
          const query = 'INSERT INTO events (link, name, event_date, summary) VALUES ($1, $2, $3, $4)';
          const values = Object.values(events);
          client.query(query, values);
          response.send(events);
        })
        .catch((error) => handleError(error, response));
    } 
    else {
      response.send(results.rows[0]);
    }
  }).catch(error => console.log(error));
});

app.get('/weather', (request, response) => {
  superagent
    .get(`https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`)
    .then((weatherData) => {
      const weather = weatherData.body.daily.data.map((day) => new Weather(day));
      response.send(weather);
    })
    .catch((error) => handleError(error, response));
});

app.get(/.*/, (req, res) => {
  res.status(404).send({ status: 404, responseText: 'This item could not be found..' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('I know that you came to party baby, baby, baby, baby');
});
