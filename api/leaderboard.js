import { createClient } from 'redis';

const KEY = 'leaderboard';
const MAX = 10;

async function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let redis;
  try {
    redis = await getClient();

    if (req.method === 'GET') {
      const raw = await redis.get(KEY);
      const board = raw ? JSON.parse(raw) : [];
      return res.status(200).json(board);
    }

    if (req.method === 'POST') {
      const { name, score } = req.body;
      if (!name || typeof score !== 'number' || score <= 0) {
        return res.status(400).json({ error: 'Invalid name or score' });
      }

      const raw = await redis.get(KEY);
      const board = raw ? JSON.parse(raw) : [];
      const entry = { name: String(name).slice(0, 12), score, date: new Date().toISOString().slice(0, 10) };
      board.push(entry);
      board.sort((a, b) => b.score - a.score);
      const trimmed = board.slice(0, MAX);
      await redis.set(KEY, JSON.stringify(trimmed));

      return res.status(200).json(trimmed);
    }

    if (req.method === 'DELETE') {
      const { name, score } = req.body || {};
      const raw = await redis.get(KEY);
      const board = raw ? JSON.parse(raw) : [];
      const idx = board.findIndex((e) => e.name === name && e.score === score);
      if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
      board.splice(idx, 1);
      await redis.set(KEY, JSON.stringify(board));
      return res.status(200).json(board);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    if (redis) {
      await redis.quit().catch(() => {});
    }
  }
}
