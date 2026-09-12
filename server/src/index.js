import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getSnapshots } from './market.js';
import { sendTelegramAlert } from './telegram.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT || 3001);
let latest = [];
const lastAlerts = new Map();

function formatAlert(snapshot) {
  const { timeframes } = snapshot;
  return [
    `${snapshot.overall === 'BUY' ? '🟢' : '🔴'} ${snapshot.overall === 'BUY' ? 'COMPRA' : 'VENTA'} — ${snapshot.baseAsset}/USDT`,
    `Precio: ${snapshot.price.toLocaleString('es-ES', { maximumFractionDigits: 6 })}`,
    '',
    `15m: RSI ${timeframes['15m'].rsi.toFixed(2)} + MACD ${timeframes['15m'].macdSignalType}`,
    `1h:  RSI ${timeframes['1h'].rsi.toFixed(2)} + MACD ${timeframes['1h'].macdSignalType}`,
    '',
    'Fractal2'
  ].join('\n');
}

async function refresh() {
  try {
    const snapshots = await getSnapshots();
    latest = snapshots;
    for (const snapshot of snapshots) {
      const previous = lastAlerts.get(snapshot.symbol);
      if (snapshot.overall !== 'NEUTRAL' && snapshot.overall !== previous) {
        await sendTelegramAlert(formatAlert(snapshot));
        lastAlerts.set(snapshot.symbol, snapshot.overall);
      }
      if (snapshot.overall === 'NEUTRAL') lastAlerts.delete(snapshot.symbol);
    }
    console.log(new Date().toISOString(), `updated ${snapshots.length}/${20} assets`);
  } catch (error) {
    console.error('Market refresh failed:', error);
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, assets: 20 }));
app.get('/api/snapshots', (_req, res) => res.json({ snapshots: latest, updatedAt: Date.now() }));
app.get('/api/snapshot/:symbol', (req, res) => {
  const snapshot = latest.find((item) => item.symbol === req.params.symbol.toUpperCase());
  if (!snapshot) return res.status(404).json({ error: 'Asset not found' });
  return res.json(snapshot);
});

app.listen(port, () => {
  console.log(`Fractal2 server listening on http://localhost:${port}`);
  void refresh();
  setInterval(() => void refresh(), 60_000);
});
