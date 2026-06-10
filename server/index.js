import express from 'express';
import cors from 'cors';
import { getNetwork, getEvents, getRanking } from './db.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.get('/api/network', async (req, res) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load network' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

app.get('/api/ranking', async (req, res) => {
  try {
    const ranking = await getRanking();
    res.json(ranking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load ranking' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});git 