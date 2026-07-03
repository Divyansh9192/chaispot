const express = require('express');
const Shop = require('../models/Shop');
const Review = require('../models/Review');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const protect = require('../middleware/auth');
const { calculateReviewPoints } = require('../utils/points');

const router = express.Router();

const recalculateShopRating = async (shopId) => {
  const reviews = await Review.find({ shop: shopId });
  const numReviews = reviews.length;
  const avgRating =
    numReviews === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews;

  await Shop.findByIdAndUpdate(shopId, {
    numReviews,
    avgRating: Math.round(avgRating * 10) / 10,
  });
};

router.post('/', protect, async (req, res) => {
  try {
    const { shopId, rating, text } = req.body;

    if (!shopId) return res.status(400).json({ message: 'shopId is required' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const existingReview = await Review.findOne({ shop: shopId, user: req.userId });
    if (existingReview) {
      return res.status(409).json({
        message: 'You already reviewed this shop. You can edit your existing review instead.',
      });
    }

    const isFirstReviewOnShop = shop.numReviews === 0;

    const review = await Review.create({ shop: shopId, user: req.userId, rating, text });

    await recalculateShopRating(shopId);

    const pointsEarned = calculateReviewPoints(isFirstReviewOnShop);
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { points: pointsEarned } },
      { new: true }
    );

    await Transaction.create({
      user: req.userId,
      type: 'earn',
      points: pointsEarned,
      reason: isFirstReviewOnShop ? 'first_review_bonus' : 'review',
    });

    res.status(201).json({ review, pointsEarned, totalPoints: user.points });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this shop' });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not submit review' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { rating, text } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only edit your own review' });
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }
    if (text !== undefined) review.text = text;

    await review.save();
    await recalculateShopRating(review.shop);

    res.json({ review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update review' });
  }
});

module.exports = router;
