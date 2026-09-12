import { RSI, MACD } from 'technicalindicators';

export type Signal = 'BUY' | 'SELL' | 'NEUTRAL';

export interface TimeframeAnalysis {
  timeframe: '15m' | '1h';
  close: number;
  rsi: number;
  rsiSignal: Signal;
  macd: number;
  macdSignal: number;
  macdSignalType: Signal;
  signal: Signal;
  candleTime: number;
}

export interface MarketSnapshot {
  symbol: string;
  price: number;
  timeframes: Record<'15m' | '1h', TimeframeAnalysis>;
  overall: Signal;
  updatedAt: number;
}

const RSI_PERIOD = 14;
const RSI_BUY_LEVEL = 40;
const RSI_SELL_LEVEL = 60;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

function rsiSignal(value: number): Signal {
  if (value <= RSI_BUY_LEVEL) return 'BUY';
  if (value >= RSI_SELL_LEVEL) return 'SELL';
  return 'NEUTRAL';
}

function macdSignal(macd: number, signal: number): Signal {
  if (macd > signal) return 'BUY';
  if (macd < signal) return 'SELL';
  return 'NEUTRAL';
}

function combine(a: Signal, b: Signal): Signal {
  return a === b ? a : 'NEUTRAL';
}

export async function fetchKlines(symbol: string, interval: '15m' | '1h', limit = 200) {
  const url = new URL('https://data-api.binance.vision/api/v3/klines');
  url.searchParams.set('symbol', symbol.toUpperCase());
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance klines error: ${response.status}`);
  return (await response.json()) as unknown[][];
}

export async function analyzeTimeframe(symbol: string, interval: '15m' | '1h'): Promise<TimeframeAnalysis> {
  const klines = await fetchKlines(symbol, interval);
  const closes = klines.map(k => Number(k[4]));
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
  const macdPoint = macdValues.at(-1);
  const macd = Number(macdPoint?.MACD ?? 0);
  const macdSignalValue = Number(macdPoint?.signal ?? 0);
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

export async function getSnapshot(symbol = 'BTCUSDT'): Promise<MarketSnapshot> {
  const [m15, h1] = await Promise.all([
    analyzeTimeframe(symbol, '15m'),
    analyzeTimeframe(symbol, '1h')
  ]);

  const allBuy = [m15, h1].every(t => t.signal === 'BUY');
  const allSell = [m15, h1].every(t => t.signal === 'SELL');

  return {
    symbol,
    price: m15.close,
    timeframes: { '15m': m15, '1h': h1 },
    overall: allBuy ? 'BUY' : allSell ? 'SELL' : 'NEUTRAL',
    updatedAt: Date.now()
  };
}
