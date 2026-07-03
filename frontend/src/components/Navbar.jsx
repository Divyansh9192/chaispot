import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setOpen(false); };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <span>☕</span> ChaiSpot
      </Link>
      <button className="navbar-hamburger" onClick={() => setOpen(!open)}>
        {open ? '✕' : '☰'}
      </button>
      <div className={`navbar-links${open ? ' open' : ''}`}>
        <NavLink to="/" end onClick={() => setOpen(false)}>Explore</NavLink>
        {user && <NavLink to="/add-shop" onClick={() => setOpen(false)}>Add Shop</NavLink>}
         {user && <NavLink to="/leaderboard" onClick={() => setOpen(false)}>Leaderboard</NavLink>}
        {user && <NavLink to="/rewards" onClick={() => setOpen(false)}>Rewards</NavLink>}
        {user ? (
          <div className="navbar-user">
            <span className="points-badge">⭐ {user.points ?? 0} pts</span>
            <span>{user.name}</span>
            <button className="btn btn-sm btn-outline" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <NavLink to="/auth" onClick={() => setOpen(false)}>Login</NavLink>
        )}
      </div>
    </nav>
  );
}
