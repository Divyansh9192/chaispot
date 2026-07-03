import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import { StarDisplay } from '../components/Stars';
import { MAPBOX_TOKEN } from '../config';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeDrawn = useRef(false);

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('');
  const [activeShop, setActiveShop] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const [userLoc, setUserLoc] = useState(null);
  const [manualLoc, setManualLoc] = useState('');
  const [locMode, setLocMode] = useState('auto');
  const [locLoading, setLocLoading] = useState(false);

  const [dirLoading, setDirLoading] = useState(false);
  const [dirInfo, setDirInfo] = useState(null);

  useEffect(() => {
    let cancel = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.getShops(search, minRating);
        if (!cancel) setShops(data.shops);
      } catch {}
      if (!cancel) setLoading(false);
    }, 300);
    return () => { cancel = true; clearTimeout(timer); };
  }, [search, minRating]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    setDirInfo(null);
    clearRoute();
  }, [activeShop]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center = userLoc ? [userLoc.lng, userLoc.lat] : [77.209, 28.6139];

    const map = new window.mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 12,
      accessToken: MAPBOX_TOKEN,
    });

    map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !userLoc) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement('div');
    el.className = 'user-marker-dot';

    userMarkerRef.current = new window.mapboxgl.Marker({ element: el })
      .setLngLat([userLoc.lng, userLoc.lat])
      .addTo(map);
  }, [userLoc]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || loading) return;

    const place = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds = new window.mapboxgl.LngLatBounds();
      let hasPoints = false;

      shops.forEach(shop => {
        if (!shop.location?.coordinates) return;
        const [lng, lat] = shop.location.coordinates;

        const el = document.createElement('div');
        el.className = 'shop-marker';
        el.innerHTML = '☕';
        el.title = shop.name;

        const marker = new window.mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
          setActiveShop(shop);
          showPopup(map, shop);
          map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
        });

        markersRef.current.push(marker);
        bounds.extend([lng, lat]);
        hasPoints = true;
      });

      if (userLoc) {
        bounds.extend([userLoc.lng, userLoc.lat]);
        hasPoints = true;
      }

      if (hasPoints && shops.length > 0) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 });
      }
    };

    if (map.loaded()) place();
    else map.on('load', place);
  }, [shops, loading, userLoc]);

  const showPopup = useCallback((map, shop) => {
    if (popupRef.current) popupRef.current.remove();

    const [lng, lat] = shop.location.coordinates;
    const ratingStr = shop.avgRating ? shop.avgRating.toFixed(1) : '—';
    const stars = shop.avgRating
      ? '★'.repeat(Math.round(shop.avgRating)) + '☆'.repeat(5 - Math.round(shop.avgRating))
      : '☆☆☆☆☆';

    const popup = new window.mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      className: 'chai-popup',
    })
      .setLngLat([lng, lat])
      .setHTML(`
        <div class="popup-content">
          <h4 class="popup-name">${shop.name}</h4>
          <p class="popup-address">${shop.address}</p>
          <div class="popup-rating">
            <span class="popup-stars">${stars}</span>
            <span class="popup-score">${ratingStr}</span>
            <span class="popup-reviews">(${shop.numReviews})</span>
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-dir" id="popup-directions-${shop._id}">🧭 Get Directions</button>
            <button class="popup-btn popup-btn-view" id="popup-view-${shop._id}">View Details →</button>
          </div>
        </div>
      `)
      .addTo(map);

    popupRef.current = popup;

    setTimeout(() => {
      const dirBtn = document.getElementById(`popup-directions-${shop._id}`);
      const viewBtn = document.getElementById(`popup-view-${shop._id}`);
      if (dirBtn) dirBtn.addEventListener('click', () => handleGetDirections(shop));
      if (viewBtn) viewBtn.addEventListener('click', () => navigate(`/shop/${shop._id}`));
    }, 50);
  }, [navigate, userLoc, locMode, manualLoc]);

  const clearRoute = () => {
    const map = mapInstance.current;
    if (!map || !routeDrawn.current) return;
    try {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
    } catch {}
    routeDrawn.current = false;
  };

  const handleGetDirections = async (shop) => {
    if (!shop) return;
    setDirLoading(true);
    setDirInfo(null);
    clearRoute();

    try {
      let origin;

      if (locMode === 'manual' && manualLoc.trim()) {
        const parts = manualLoc.split(',').map(s => s.trim());
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
          toast.error('Enter location as "latitude, longitude" (e.g. 28.61, 77.21)');
          setDirLoading(false);
          return;
        }
        origin = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
      } else if (userLoc) {
        origin = userLoc;
      } else {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(origin);
        } catch {
          toast.error('Could not get your location. Try entering it manually.');
          setLocMode('manual');
          setDirLoading(false);
          return;
        }
      }

      const [lng, lat] = shop.location.coordinates;
      const data = await api.getDirections(origin, { lat, lng });
      const route = data.route;

      const totalMins = Math.round(route.duration / 60);
      let durationStr;
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
        shopName: shop.name,
      });

      const map = mapInstance.current;
      if (map && route.geometry) {
        if (map.getSource('route')) {
          map.removeLayer('route-line');
          map.removeSource('route');
        }

        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: route.geometry },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#F59E0B',
            'line-width': 5,
            'line-opacity': 0.85,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        });

        routeDrawn.current = true;

        const coords = route.geometry.coordinates;
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new window.mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        bounds.extend([origin.lng, origin.lat]);
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
      }

      toast.success(`Route found — ${durationStr}, ${(route.distance / 1000).toFixed(1)} km`);
    } catch (err) {
      toast.error(err.message || 'Could not get directions');
    }

    setDirLoading(false);
  };

  const handleShopCardClick = (shop) => {
    const map = mapInstance.current;
    if (!map || !shop.location?.coordinates) return;

    setActiveShop(shop);
    const [lng, lat] = shop.location.coordinates;
    map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
    showPopup(map, shop);
  };

  return (
    <div className="fade-in">
      <section className="hero">
        <h1>Discover Your Perfect<br />Cup of <span className="highlight">Chai</span></h1>
        <p>Find the best chai spots around you, share your reviews, and earn rewards with every sip.</p>
      </section>

      <section className="page-section" style={{ paddingTop: 0, paddingBottom: '60px', maxWidth: '1400px' }}>
        <div className="home-map-layout glass-card" style={{ padding: 0 }}>
      <div className="map-container">
        <div ref={mapRef} className="full-map" id="home-map" />

        <div className="map-overlay-top">
          <div className="map-search-bar glass-card">
            <span className="map-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search chai shops..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="search-input"
            />
            <select value={minRating} onChange={e => setMinRating(e.target.value)} id="filter-rating">
              <option value="">All Ratings</option>
              <option value="3">3+ ★</option>
              <option value="4">4+ ★</option>
              <option value="5">5 ★</option>
            </select>
          </div>
        </div>

        {dirInfo && (
          <div className="dir-overlay glass-card">
            <div className="dir-overlay-header">
              <span className="dir-overlay-icon">🧭</span>
              <span className="dir-overlay-title">Route to {dirInfo.shopName}</span>
              <button className="dir-overlay-close" onClick={() => { setDirInfo(null); clearRoute(); }}>✕</button>
            </div>
            <div className="dir-overlay-stats">
              <div className="dir-stat">
                <span className="dir-stat-value">{dirInfo.distance}</span>
                <span className="dir-stat-label">Distance</span>
              </div>
              <div className="dir-stat-divider" />
              <div className="dir-stat">
                <span className="dir-stat-value">{dirInfo.duration}</span>
                <span className="dir-stat-label">Duration</span>
              </div>
            </div>
          </div>
        )}

        {dirLoading && (
          <div className="map-loading-overlay">
            <div className="spinner" />
            <span>Getting directions...</span>
          </div>
        )}

        <button
          className="panel-toggle-btn"
          onClick={() => setPanelOpen(!panelOpen)}
          title={panelOpen ? 'Hide shop list' : 'Show shop list'}
        >
          {panelOpen ? '◀' : '▶'}
        </button>
      </div>

      <aside className={`shop-panel ${panelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>☕ Chai Shops</h2>
          <span className="panel-count">{shops.length} found</span>
        </div>

        {user && (
          <button className="btn btn-primary btn-sm panel-add-btn" onClick={() => navigate('/add-shop')}>
            + Add Shop
          </button>
        )}

        <div className="panel-list">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : shops.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <div className="emoji">🍵</div>
              <p>No chai shops found.</p>
            </div>
          ) : (
            shops.map(shop => (
              <div
                key={shop._id}
                className={`panel-shop-card ${activeShop?._id === shop._id ? 'active' : ''}`}
                onClick={() => handleShopCardClick(shop)}
                id={`shop-${shop._id}`}
              >
                {shop.photoUrl ? (
                  <img src={shop.photoUrl} alt={shop.name} className="panel-shop-img" />
                ) : (
                  <div className="panel-shop-img placeholder">☕</div>
                )}
                <div className="panel-shop-info">
                  <h4>{shop.name}</h4>
                  <p className="panel-shop-address">{shop.address}</p>
                  <div className="panel-shop-rating">
                    <StarDisplay value={shop.avgRating} />
                    <span className="panel-rating-num">
                      {shop.avgRating ? shop.avgRating.toFixed(1) : '—'}
                    </span>
                    <span className="panel-review-count">({shop.numReviews})</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
        </div>
      </section>
    </div>
  );
}
