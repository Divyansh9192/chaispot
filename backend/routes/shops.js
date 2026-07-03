const express = require('express');
const Shop = require('../models/Shop');
const Review = require('../models/Review');
const protect = require('../middleware/auth');
const { geocodeAddress } = require('../utils/mapbox');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q, minRating } = req.query;
    const filter = {};

    if (q) filter.name = { $regex: q, $options: 'i' };
    if (minRating) filter.avgRating = { $gte: Number(minRating) };

    const shops = await Shop.find(filter).sort({ createdAt: -1 });
    res.json({ shops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch shops' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const reviews = await Review.find({ shop: shop._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({ shop, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch shop' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, address, description, photoUrl } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Name and address are required' });
    }

    let coords;
    try {
      coords = await geocodeAddress(address);
    } catch (err) {
      if (err.code === 'GEOCODE_NOT_FOUND') {
        return res
          .status(422)
          .json({ message: "We couldn't find that address. Please check it and try again." });
      }
      throw err;
    }

    const shop = await Shop.create({
      name,
      address,
      description,
      photoUrl,
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      addedBy: req.userId,
    });

    res.status(201).json({ shop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add shop. Please try again.' });
  }
});

module.exports = router;
