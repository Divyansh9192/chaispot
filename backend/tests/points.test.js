const {
  calculateReviewPoints,
  canRedeem,
  generateCouponCode,
  REVIEW_POINTS,
  NEW_SHOP_BONUS_POINTS,
  REDEMPTION_THRESHOLD,
} = require('../utils/points');

describe('calculateReviewPoints', () => {
  test('gives bonus points for the first review on a new shop', () => {
    expect(calculateReviewPoints(true)).toBe(NEW_SHOP_BONUS_POINTS);
  });

  test('gives normal points for reviews on shops that already have reviews', () => {
    expect(calculateReviewPoints(false)).toBe(REVIEW_POINTS);
  });
});

describe('canRedeem', () => {
  test('blocks redemption when the user is below the threshold', () => {
    expect(canRedeem(REDEMPTION_THRESHOLD - 1).ok).toBe(false);
  });

  test('blocks redemption at zero points', () => {
    expect(canRedeem(0).ok).toBe(false);
  });

  test('allows redemption exactly at the threshold', () => {
    expect(canRedeem(REDEMPTION_THRESHOLD).ok).toBe(true);
  });

  test('allows redemption when balance is above the threshold', () => {
    expect(canRedeem(REDEMPTION_THRESHOLD + 100).ok).toBe(true);
  });
});

describe('generateCouponCode', () => {
  test('always starts with CHAI- and has a 6 character code', () => {
    const code = generateCouponCode();
    expect(code).toMatch(/^CHAI-[A-Z0-9]{6}$/);
  });

  test('generates different codes across calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateCouponCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
