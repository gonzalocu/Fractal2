import { RSI, MACD } from 'technicalindicators';

export const WATCHLIST = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH' },
  { symbol: 'BNBUSDT', baseAsset: 'BNB' },
  { symbol: 'XRPUSDT', baseAsset: 'XRP' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA' },
  { symbol: 'TRXUSDT', baseAsset: 'TRX' },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX' },
  { symbol: 'LINKUSDT', baseAsset: 'LINK' },
  { symbol: 'BCHUSDT', baseAsset: 'BCH' },
  { symbol: 'LTCUSDT', baseAsset: 'LTC' },
  { symbol: 'DOTUSDT', baseAsset: 'DOT' },
  { symbol: 'SHIBUSDT', baseAsset: 'SHIB' },
  { symbol: 'TONUSDT', baseAsset: 'TON' },
  { symbol: 'UNIUSDT', baseAsset: 'UNI' },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR' },
  { symbol: 'APTUSDT', baseAsset: 'APT' },
  { symbol: 'XLMUSDT', baseAsset: 'XLM' },
  { symbol: 'ETCUSDT', baseAsset: 'ETC' }
];

const RSI_PERIOD = 14;
const RSI_BUY_LEVEL = 40;
const RSI_SELL_LEVEL = 60;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

function rsiSignal(value) {
  if (value <= RSI_BUY_LEVEL) return 'BUY';
  if (value >= RSI_SELL_LEVEL) return 'SELL';
  return 'NEUTRAL';
}

function macdSignal(macd, signal) {
  if (macd > signal) return 'BUY';
  if (macd < signal) return 'SELL';
  return 'NEUTRAL';
}

function combine(a, b) {
  return a === b ? a : 'NEUTRAL';
}

async function fetchKlines(symbol, interval, limit = 200) {
  const url = new URL('https://data-api.binance.vision/api/v3/klines');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', String(limit));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance ${symbol} ${interval}: HTTP ${response.status}`);
  return response.json();
}

export async function analyzeTimeframe(symbol, interval) {
  const klines = await fetchKlines(symbol, interval);
  const closes = klines.map((k) => Number(k[4]));
  const candleTime = Number(klines.at(-1)?.[0] ?? Date.now());
  const close = closes.at(-1) ?? 0;
  const rsiValues = RSI.calculate({ period: RSI_PERIOD, values: closes });
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: MACD_FAST,
    slowPeriod: MACD_SLOW,
    signalPeriod: MACD_SIGNAL,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const rsi = rsiValues.at(-1) ?? 50;
  const macdPoint = macdValues.at(-1) || {};
  const macd = Number(macdPoint.MACD ?? 0);
  const macdSignalValue = Number(macdPoint.signal ?? 0);
  const rsiType = rsiSignal(rsi);
  const macdType = macdSignal(macd, macdSignalValue);
  return {
    timeframe: interval,
    close,
    rsi,
    rsiSignal: rsiType,
    macd,
    macdSignal: macdSignalValue,
    macdSignalType: macdType,
    signal: combine(rsiType, macdType),
    candleTime
  };
}

export async function getSnapshot(asset) {
  const [m15, h1] = await Promise.all([
    analyzeTimeframe(asset.symbol, '15m'),
    analyzeTimeframe(asset.symbol, '1h')
  ]);
  const allBuy = [m15, h1].every((t) => t.signal === 'BUY');
  const allSell = [m15, h1].every((t) => t.signal === 'SELL');
  return {
    symbol: asset.symbol,
    baseAsset: asset.baseAsset,
    price: m15.close,
    timeframes: { '15m': m15, '1h': h1 },
    overall: allBuy ? 'BUY' : allSell ? 'SELL' : 'NEUTRAL',
    updatedAt: Date.now()
  };
}

export async function getSnapshots() {
  const results = await Promise.allSettled(WATCHLIST.map(getSnapshot));
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
}
