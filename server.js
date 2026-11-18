import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skyline';
const MAX_FAVORITES = 20;

/* ---------- database ---------- */
// Cached forecasts: MongoDB deletes each document automatically after 15 minutes (TTL index).
const Forecast = mongoose.model('Forecast', new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 900 }
}));

// Saved cities, one set per anonymous device id.
const favSchema = new mongoose.Schema({
  deviceId: { type: String, index: true },
  name: { type: String, maxlength: 120 },
  lat: Number,
  lon: Number,
  createdAt: { type: Date, default: Date.now }
});
favSchema.index({ deviceId: 1, lat: 1, lon: 1 }, { unique: true });
const Favorite = mongoose.model('Favorite', favSchema);

let dbUp = false;
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  dbUp = true;
  console.log('MongoDB connected');
} catch (e) {
  console.warn('MongoDB not reachable. Forecasts still work, but caching and saved cities are off.');
}

/* ---------- app ---------- */
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120 }));

const ah = fn => (req, res, next) => fn(req, res, next).catch(next);
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; };

function device(req, res, next) {
  const id = req.get('x-device-id') || '';
  if (!/^[\w-]{8,64}$/.test(id)) return res.status(400).json({ error: 'Missing or invalid device id.' });
  req.deviceId = id;
  next();
}
function needDb(req, res, next) {
  if (!dbUp) return res.status(503).json({ error: 'Database is offline.' });
  next();
}

const FORECAST_FIELDS =
  'current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
  '&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset' +
  '&timezone=auto&forecast_days=7';

// GET /api/forecast?lat=..&lon=..  (cached 15 min)
app.get('/api/forecast', ah(async (req, res) => {
  const lat = num(req.query.lat, -90, 90), lon = num(req.query.lon, -180, 180);
  if (lat === null || lon === null) return res.status(400).json({ error: 'lat and lon are required.' });
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  if (dbUp) {
    const hit = await Forecast.findOne({ key }).lean();
    if (hit) { res.set('X-Cache', 'HIT'); return res.json(hit.data); }
  }
  const up = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${FORECAST_FIELDS}`);
  if (!up.ok) return res.status(502).json({ error: 'Forecast service is unavailable.' });
  const data = await up.json();
  if (dbUp) await Forecast.findOneAndUpdate({ key }, { data, createdAt: new Date() }, { upsert: true });
  res.set('X-Cache', 'MISS');
  res.json(data);
}));

// GET /api/geocode?q=Paris
app.get('/api/geocode', ah(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (!q) return res.status(400).json({ error: 'q is required.' });
  const up = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
  if (!up.ok) return res.status(502).json({ error: 'Search service is unavailable.' });
  res.json(await up.json());
}));

// Saved cities
app.get('/api/favorites', device, needDb, ah(async (req, res) => {
  res.json(await Favorite.find({ deviceId: req.deviceId }).sort({ createdAt: 1 }).lean());
}));

app.post('/api/favorites', device, needDb, ah(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const lat = num(req.body.lat, -90, 90), lon = num(req.body.lon, -180, 180);
  if (!name || lat === null || lon === null) return res.status(400).json({ error: 'name, lat and lon are required.' });
  if (await Favorite.countDocuments({ deviceId: req.deviceId }) >= MAX_FAVORITES)
    return res.status(409).json({ error: `You can save up to ${MAX_FAVORITES} cities.` });
  const doc = await Favorite.findOneAndUpdate(
    { deviceId: req.deviceId, lat: +lat.toFixed(2), lon: +lon.toFixed(2) },
    { $setOnInsert: { name, createdAt: new Date() } },
    { upsert: true, new: true }
  );
  res.status(201).json(doc);
}));

app.delete('/api/favorites/:id', device, needDb, ah(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id.' });
  await Favorite.deleteOne({ _id: req.params.id, deviceId: req.deviceId });
  res.status(204).end();
}));

// Frontend
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => console.log(`Skyline running at http://localhost:${PORT}`));
