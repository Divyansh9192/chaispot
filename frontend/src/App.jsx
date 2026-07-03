import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import Home from './pages/Home';
import ShopDetail from './pages/ShopDetail';
import AddShop from './pages/AddShop';
import Rewards from './pages/Rewards';
import Auth from './pages/Auth';
import Leaderboard from './pages/Leaderboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <ToastContainer />
      <main id="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop/:id" element={<ShopDetail />} />
          <Route path="/add-shop" element={<ProtectedRoute><AddShop /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
