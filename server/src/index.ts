import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getSnapshot, type MarketSnapshot } from './market.js';
import { sendTelegramAlert } from './telegram.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 3001);
const symbol = (process.env.SYMBOL ?? 'BTCUSDT').toUpperCase();
let latest: MarketSnapshot | null = null;
let lastAlert: 'BUY' | 'SELL' | null = null;

function formatAlert(snapshot: MarketSnapshot) {
  const { timeframes } = snapshot;
  const lines = [
    `${snapshot.overall === 'BUY' ? '🟢' : '🔴'} ${snapshot.overall === 'BUY' ? 'COMPRA' : 'VENTA'} — ${snapshot.symbol}`,
    `Precio: ${snapshot.price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`,
    '',
    `15m: RSI ${timeframes['15m'].rsi.toFixed(2)} + MACD ${timeframes['15m'].macdSignalType}`,
    `1h:  RSI ${timeframes['1h'].rsi.toFixed(2)} + MACD ${timeframes['1h'].macdSignalType}`,
    '',
    'Fractal2'
  ];
  return lines.join('\n');
}

async function refresh() {
  try {
    const snapshot = await getSnapshot(symbol);
    latest = snapshot;

    // Only notify when a new full BUY/SELL condition appears.
    if (snapshot.overall !== 'NEUTRAL' && snapshot.overall !== lastAlert) {
      await sendTelegramAlert(formatAlert(snapshot));
      lastAlert = snapshot.overall;
    }

    console.log(new Date().toISOString(), symbol, snapshot.overall);
  } catch (error) {
    console.error('Market refresh failed:', error);
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, symbol }));
app.get('/api/snapshot', (_req, res) => {
  if (!latest) return res.status(503).json({ error: 'Market data not ready yet' });
  return res.json(latest);
});

app.listen(port, () => {
  console.log(`Fractal2 server listening on http://localhost:${port}`);
  void refresh();
  setInterval(() => void refresh(), 60_000);
});
