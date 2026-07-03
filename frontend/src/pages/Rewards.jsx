import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';

const THRESHOLD = 50;

export default function Rewards() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [coupon, setCoupon] = useState(null);

  const load = async () => {
    try {
      const [b, h] = await Promise.all([api.getBalance(), api.getHistory()]);
      setBalance(b.points);
      setHistory(h.transactions);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const data = await api.redeem();
      setCoupon(data.couponCode);
      setBalance(data.remainingPoints);
      toast.success('Coupon redeemed! 🎉');
      refreshUser();
      const h = await api.getHistory();
      setHistory(h.transactions);
    } catch (err) {
      toast.error(err.message);
    }
    setRedeeming(false);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatReason = (r) => {
    const map = { review: 'Review Reward', first_review_bonus: 'First Review Bonus', coupon_redemption: 'Coupon Redeemed' };
    return map[r] || r;
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const pts = balance ?? user?.points ?? 0;
  const progress = Math.min((pts / THRESHOLD) * 100, 100);

  return (
    <div className="rewards-page fade-in">
      <h1>🎁 Your Rewards</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        Earn points by reviewing chai shops. Redeem them for exclusive coupons!
      </p>

      <div className="glass-card points-display">
        <div className="points-number">{pts}</div>
        <div className="points-label">Points Available</div>
      </div>

      <div className="progress-section">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          <span>{pts} / {THRESHOLD} pts</span>
          <span>{pts >= THRESHOLD ? '✅ Ready to redeem!' : `${THRESHOLD - pts} pts to go`}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleRedeem}
          disabled={pts < THRESHOLD || redeeming}
          style={{ padding: '12px 32px', fontSize: '1rem' }}
        >
          {redeeming ? 'Redeeming...' : `🎟️ Redeem Coupon (${THRESHOLD} pts)`}
        </button>
      </div>

      {coupon && (
        <div className="coupon-reveal glass-card">
          <div style={{ fontSize: '1.5rem' }}>🎉</div>
          <p style={{ color: 'var(--text-secondary)' }}>Here's your coupon code:</p>
          <div className="coupon-code">{coupon}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Show this at any partner chai shop!</p>
        </div>
      )}

      <div className="history-section">
        <h2>📜 Points History</h2>
        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>No activity yet. Start reviewing shops to earn points!</p>
          </div>
        ) : (
          history.map(t => (
            <div key={t._id} className="history-item">
              <div className="hi-left">
                <span className="hi-reason">{formatReason(t.reason)}</span>
                <span className="hi-date">{formatDate(t.createdAt)}</span>
                {t.couponCode && <span style={{ fontSize: '0.8rem', color: 'var(--amber-400)' }}>Code: {t.couponCode}</span>}
              </div>
              <span className={`hi-points ${t.type}`}>
                {t.type === 'earn' ? '+' : '-'}{t.points}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
