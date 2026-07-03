const REVIEW_POINTS = 10;
const NEW_SHOP_BONUS_POINTS = 15;
const REDEMPTION_THRESHOLD = 50;

const calculateReviewPoints = (isFirstReviewOnShop) => {
  return isFirstReviewOnShop ? NEW_SHOP_BONUS_POINTS : REVIEW_POINTS;
};

const canRedeem = (userPoints) => {
  if (userPoints < REDEMPTION_THRESHOLD) {
    return {
      ok: false,
      reason: `You need at least ${REDEMPTION_THRESHOLD} points to redeem a coupon`,
    };
  }
  return { ok: true };
};

const generateCouponCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CHAI-${code}`;
};

module.exports = {
  REVIEW_POINTS,
  NEW_SHOP_BONUS_POINTS,
  REDEMPTION_THRESHOLD,
  calculateReviewPoints,
  canRedeem,
  generateCouponCode,
};
