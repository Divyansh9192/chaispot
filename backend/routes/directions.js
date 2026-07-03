const express = require('express');
const { getDirections } = require('../utils/mapbox');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination || origin.lat == null || destination.lat == null) {
      return res
        .status(400)
        .json({ message: 'origin and destination, each as { lat, lng }, are required' });
    }

    const route = await getDirections(origin, destination);
    res.json({ route });
  } catch (err) {
    if (err.code === 'ROUTE_NOT_FOUND') {
      return res.status(422).json({ message: 'No route could be found between these points' });
    }
    console.error(err);
    res.status(502).json({ message: 'Could not fetch directions right now' });
  }
});

module.exports = router;
