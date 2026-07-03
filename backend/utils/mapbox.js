const axios = require('axios');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const geocodeAddress = async (address) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json`;

  const response = await axios.get(url, {
    params: { access_token: MAPBOX_TOKEN, limit: 1 },
  });

  const results = response.data.features;

  if (!results || results.length === 0) {
    const error = new Error('No location found for that address');
    error.code = 'GEOCODE_NOT_FOUND';
    throw error;
  }

  const [lng, lat] = results[0].center;
  return { lat, lng };
};

const getDirections = async (origin, destination) => {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`;

  const response = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      geometries: 'geojson',
      overview: 'full',
    },
  });

  const routes = response.data.routes;

  if (!routes || routes.length === 0) {
    const error = new Error('No route found between these points');
    error.code = 'ROUTE_NOT_FOUND';
    throw error;
  }

  return routes[0];
};

module.exports = { geocodeAddress, getDirections };
