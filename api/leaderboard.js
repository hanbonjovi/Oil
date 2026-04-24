import { createClient } from '@vercel/kv';

const KEY = 'leaderboard';
const MAX = 10;

function getClient() {
  const url = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN;
  if (!url || !token) throw new Error('Missing KV env vars');
  return createClient({ url, token });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const kv = getClient();

    if (req.method === 'GET') {
      const board = (await kv.get(KEY)) || [];
      return res.status(200).json(board);
    }

    if (req.method === 'POST') {
      const { name, score } = req.body;
      if (!name || typeof score !== 'number' || score <= 0) {
        return res.status(400).json({ error: 'Invalid name or score' });
      }

      const board = (await kv.get(KEY)) || [];
      const entry = { name: String(name).slice(0, 12), score, date: new Date().toISOString().slice(0, 10) };
      board.push(entry);
      board.sort((a, b) => b.score - a.score);
      const trimmed = board.slice(0, MAX);
      await kv.set(KEY, trimmed);

      return res.status(200).json(trimmed);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
