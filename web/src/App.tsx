import { useEffect, useState } from 'react';

type Signal = 'BUY' | 'SELL' | 'NEUTRAL';
type TF = {
  timeframe: '15m' | '1h';
  close: number;
  rsi: number;
  rsiSignal: Signal;
  macd: number;
  macdSignal: number;
  macdSignalType: Signal;
  signal: Signal;
  candleTime: number;
};
type Snapshot = {
  symbol: string;
  price: number;
  timeframes: { '15m': TF; '1h': TF };
  overall: Signal;
  updatedAt: number;
};

const api = '/api/snapshot';

function Badge({ signal }: { signal: Signal }) {
  const label = signal === 'BUY' ? 'COMPRA' : signal === 'SELL' ? 'VENTA' : 'NEUTRO';
  return <span className={`badge ${signal.toLowerCase()}`}>{label}</span>;
}

function TimeframeCard({ title, data }: { title: string; data: TF }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>{title}</h2>
        <Badge signal={data.signal} />
      </div>
      <div className="metrics">
        <div>
          <span>RSI 14</span>
          <strong>{data.rsi.toFixed(2)}</strong>
          <Badge signal={data.rsiSignal} />
        </div>
        <div>
          <span>MACD</span>
          <strong>{data.macd.toFixed(5)}</strong>
          <Badge signal={data.macdSignalType} />
        </div>
      </div>
      <div className="macd-detail">Señal MACD: {data.macdSignal.toFixed(5)}</div>
    </section>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await fetch(api);
      if (!response.ok) throw new Error('El servidor todavía no tiene datos.');
      setSnapshot(await response.json());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!snapshot) {
    return <main className="app"><div className="loading"><h1>Fractal2</h1><p>{error || 'Conectando con Binance…'}</p></div></main>;
  }

  const isAlert = snapshot.overall !== 'NEUTRAL';

  return (
    <main className="app">
      <header>
        <div>
          <div className="eyebrow">CRYPTO SIGNALS</div>
          <h1>Fractal2</h1>
          <p className="subtitle">RSI + MACD · confirmación 15m + 1h</p>
        </div>
        <div className="price">
          <span>{snapshot.symbol}</span>
          <strong>${snapshot.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
        </div>
      </header>

      <section className={`hero ${snapshot.overall.toLowerCase()}`}>
        <div>
          <span className="hero-label">SEÑAL GLOBAL</span>
          <h2>{snapshot.overall === 'BUY' ? 'COMPRA' : snapshot.overall === 'SELL' ? 'VENTA' : 'ESPERAR'}</h2>
          <p>{isAlert ? 'RSI y MACD coinciden en las dos temporalidades.' : 'No hay confirmación completa todavía.'}</p>
        </div>
        <div className="hero-dot" aria-hidden="true" />
      </section>

      <div className="grid">
        <TimeframeCard title="15 minutos" data={snapshot.timeframes['15m']} />
        <TimeframeCard title="1 hora" data={snapshot.timeframes['1h']} />
      </div>

      <section className="rules card">
        <h2>Reglas actuales</h2>
        <ul>
          <li>RSI 14: compra ≤ 40 · venta ≥ 60.</li>
          <li>MACD 12/26/9: compra cuando MACD está sobre su señal · venta cuando está debajo.</li>
          <li>Alerta verde/roja solo cuando ambas condiciones coinciden en 15m y 1h.</li>
          <li>Telegram avisa una sola vez al aparecer una nueva señal global.</li>
        </ul>
      </section>

      <footer>Actualizado: {new Date(snapshot.updatedAt).toLocaleTimeString('es-ES')}</footer>
    </main>
  );
}
