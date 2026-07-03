const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const protect = require('../middleware/auth');
const { canRedeem, generateCouponCode, REDEMPTION_THRESHOLD } = require('../utils/points');

const router = express.Router();

router.get('/balance', protect, async (req, res) => {
  const user = await User.findById(req.userId).select('points');
  res.json({ points: user.points, redemptionThreshold: REDEMPTION_THRESHOLD });
});

router.get('/history', protect, async (req, res) => {
  const transactions = await Transaction.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json({ transactions });
});

router.post('/redeem', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const check = canRedeem(user.points);
    if (!check.ok) {
      return res.status(400).json({ message: check.reason });
    }

    const couponCode = generateCouponCode();

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.userId, points: { $gte: REDEMPTION_THRESHOLD } },
      { $inc: { points: -REDEMPTION_THRESHOLD } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ message: 'You cannot redeem more points than you have' });
    }

    await Transaction.create({
      user: req.userId,
      type: 'redeem',
      points: REDEMPTION_THRESHOLD,
      reason: 'coupon_redemption',
      couponCode,
    });

    res.json({
      couponCode,
      pointsSpent: REDEMPTION_THRESHOLD,
      remainingPoints: updatedUser.points,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not process redemption' });
  }
});

router.get('/leaderboard', protect, async(req,res)=>{
  try{
    const users = await User.find({}).select('name points').sort({points:-1,createdAt: 1 })
    res.json({users})
  }catch(err){
    console.log(err)
    res.status(500).json({message:'Could not geneate leaderboard'})
  }
})

module.exports = router;
