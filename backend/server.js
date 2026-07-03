require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const reviewRoutes = require('./routes/reviews');
const pointsRoutes = require('./routes/points');
const directionsRoutes = require('./routes/directions');

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://chaispot.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

connectDB();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/directions', directionsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
