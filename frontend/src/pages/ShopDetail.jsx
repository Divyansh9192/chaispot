import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import { StarDisplay, StarRating } from '../components/Stars';
import { MAPBOX_TOKEN } from '../config';

export default function ShopDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);   

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [dirInfo, setDirInfo] = useState(null);
  const [dirLoading, setDirLoading] = useState(false);

  const load = async () => {
    try {
      const data = await api.getShop(id);
      setShop(data.shop);
      setReviews(data.reviews);
      if (user) {
        const mine = data.reviews.find(r => r.user?._id === user._id || r.user?.id === user._id);
        if (mine) { setRating(mine.rating); setText(mine.text || ''); setEditingId(mine._id); }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

useLayoutEffect(() => {
  if (!shop) return;
  if (!mapRef.current) return;

  const [lng, lat] = shop.location.coordinates;

  if (mapInstance.current) {
    mapInstance.current.remove();
    mapInstance.current = null;
  }

  const map = new window.mapboxgl.Map({
    container: mapRef.current,
    style: "mapbox://styles/mapbox/dark-v11",
    center: [lng, lat],
    zoom: 14,
    accessToken: MAPBOX_TOKEN,
  });

  mapInstance.current = map;

  map.on("load", () => {
    new window.mapboxgl.Marker({
      color: "#F59E0B",
    })
      .setLngLat([lng, lat])
      .addTo(map);

    map.addControl(
      new window.mapboxgl.NavigationControl(),
      "top-right"
    );

    map.resize();
  });

  return () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };
}, [shop]);

  const handleReview = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.editReview(editingId, { rating, text });
        toast.success('Review updated!');
      } else {
        const data = await api.addReview({ shopId: id, rating, text });
        toast.success(`Review posted! +${data.pointsEarned} points ⭐`);
        refreshUser();
      }
      await load();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const getDirections = async () => {
    setDirLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const [lng, lat] = shop.location.coordinates;
      const data = await api.getDirections(origin, { lat, lng });
      const route = data.route;
      const totalMins = Math.round(route.duration / 60);
      let durationStr = '';
      if (totalMins >= 60) {
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        durationStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      } else {
        durationStr = `${totalMins} min`;
      }
      setDirInfo({
        distance: (route.distance / 1000).toFixed(1) + ' km',
        duration: durationStr,
      });
      const map = mapInstance.current;
      if (map && route.geometry) {
        if (map.getSource('route')) map.removeLayer('route-line'), map.removeSource('route');
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: route.geometry } });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route',
          paint: { 'line-color': '#F59E0B', 'line-width': 4, 'line-opacity': 0.8 } });
        const coords = route.geometry.coordinates;
        const bounds = coords.reduce((b, c) => b.extend(c), new window.mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 60 });
      }
    } catch (err) {
      toast.error(err.message || 'Could not get directions. Make sure location is enabled.');
    }
    setDirLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!shop) return <div className="empty-state"><div className="emoji">😕</div><p>Shop not found</p></div>;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="shop-detail fade-in">
      {shop.photoUrl && <img src={shop.photoUrl} alt={shop.name} className="shop-detail-photo" />}

      <div className="shop-detail-header">
        <h1>{shop.name}</h1>
        <div className="address">📍 {shop.address}</div>
        <div className="meta-row">
          <StarDisplay value={shop.avgRating} size="1.1rem" />
          <span style={{ color: 'var(--amber-500)', fontWeight: 700 }}>{shop.avgRating ? shop.avgRating.toFixed(1) : '—'}</span>
          <span style={{ color: 'var(--text-muted)' }}>({shop.numReviews} reviews)</span>
        </div>
        {shop.description && <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>{shop.description}</p>}
      </div>

      <div ref={mapRef} className="shop-map" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={getDirections} disabled={dirLoading}>
          {dirLoading ? 'Getting route...' : '🧭 Get Directions'}
        </button>
        {dirInfo && (
          <div className="direction-info">
            <div className="di-item"><span className="di-label">Distance</span><span className="di-value">{dirInfo.distance}</span></div>
            <div className="di-item"><span className="di-label">Duration</span><span className="di-value">{dirInfo.duration}</span></div>
          </div>
        )}
      </div>

      <div className="reviews-section">
        <h2>Reviews</h2>
        {reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          reviews.map(r => (
            <div key={r._id} className="review-card glass-card">
              <div className="review-header">
                <div>
                  <span className="reviewer-name">{r.user?.name || 'Unknown'}</span>
                  <StarDisplay value={r.rating} size="0.9rem" />
                </div>
                <span className="review-date">{formatDate(r.createdAt)}</span>
              </div>
              {r.text && <p className="review-text">{r.text}</p>}
            </div>
          ))
        )}

        {user && (
          <form className="review-form glass-card" onSubmit={handleReview}>
            <h3>{editingId ? '✏️ Edit Your Review' : '✍️ Write a Review'}</h3>
            <div style={{ margin: '12px 0' }}>
              <StarRating value={rating} onChange={setRating} size="1.5rem" />
            </div>
            <div className="input-group">
              <textarea className="input-field" placeholder="Share your thoughts about this chai..." value={text} onChange={e => setText(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 12 }}>
              {submitting ? 'Submitting...' : editingId ? 'Update Review' : 'Submit Review'}
            </button>
            {!editingId && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              You'll earn points for your review! ⭐
            </p>}
          </form>
        )}
      </div>
    </div>
  );
}
