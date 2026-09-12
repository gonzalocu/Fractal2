import { useEffect, useMemo, useState } from 'react';

const SIGNALS_API = '/api/snapshots';

function Badge({ signal }) {
  const label = signal === 'BUY' ? 'COMPRA' : signal === 'SELL' ? 'VENTA' : 'NEUTRO';
  return <span className={`badge ${signal.toLowerCase()}`}>{label}</span>;
}

function CoinCard({ snapshot, selected, onSelect }) {
  const signal = snapshot.overall;
  return (
    <button className={`coin-card ${signal.toLowerCase()} ${selected ? 'selected' : ''}`} onClick={() => onSelect(snapshot.symbol)}>
      <div className="coin-head">
        <strong>{snapshot.baseAsset}</strong>
        <Badge signal={signal} />
      </div>
      <div className="coin-price">${snapshot.price.toLocaleString('en-US', { maximumFractionDigits: 6 })}</div>
      <div className="coin-mini">
        <span>15m <b>{snapshot.timeframes['15m'].rsi.toFixed(0)}</b></span>
        <span>1h <b>{snapshot.timeframes['1h'].rsi.toFixed(0)}</b></span>
      </div>
    </button>
  );
}

function Detail({ snapshot }) {
  const tf = snapshot.timeframes;
  const globalText = snapshot.overall === 'BUY' ? 'COMPRA' : snapshot.overall === 'SELL' ? 'VENTA' : 'ESPERAR';
  return (
    <>
      <section className={`hero ${snapshot.overall.toLowerCase()}`}>
        <div>
          <span className="hero-label">SEÑAL GLOBAL · {snapshot.baseAsset}/USDT</span>
          <h2>{globalText}</h2>
          <p>{snapshot.overall === 'NEUTRAL' ? 'RSI y MACD no están alineados en ambas temporalidades.' : 'RSI + MACD coinciden en 15m y 1h.'}</p>
        </div>
        <div className="hero-dot" aria-hidden="true" />
      </section>
      <div className="grid">
        {['15m', '1h'].map((interval) => (
          <section className="card" key={interval}>
            <div className="card-title">
              <h2>{interval === '15m' ? '15 minutos' : '1 hora'}</h2>
              <Badge signal={tf[interval].signal} />
            </div>
            <div className="metrics">
              <div><span>RSI 14</span><strong>{tf[interval].rsi.toFixed(2)}</strong><Badge signal={tf[interval].rsiSignal} /></div>
              <div><span>MACD</span><strong>{tf[interval].macd.toFixed(5)}</strong><Badge signal={tf[interval].macdSignalType} /></div>
            </div>
            <div className="macd-detail">Señal MACD: {tf[interval].macdSignal.toFixed(5)}</div>
          </section>
        ))}
      </div>
    </>
  );
}

export default function App() {
  const [snapshots, setSnapshots] = useState([]);
  const [selected, setSelected] = useState('BTCUSDT');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  async function load() {
    try {
      const response = await fetch(SIGNALS_API);
      if (!response.ok) throw new Error('El servidor todavía no tiene datos.');
      const data = await response.json();
      setSnapshots(data.snapshots || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error cargando datos');
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedSnapshot = snapshots.find((item) => item.symbol === selected) || snapshots[0];
  const visible = useMemo(() => filter === 'ALL' ? snapshots : snapshots.filter((item) => item.overall === filter), [snapshots, filter]);
  const buyCount = snapshots.filter((x) => x.overall === 'BUY').length;
  const sellCount = snapshots.filter((x) => x.overall === 'SELL').length;

  if (!selectedSnapshot) {
    return <main className="app"><div className="loading"><h1>Fractal2</h1><p>{error || 'Conectando con Binance…'}</p></div></main>;
  }

  return (
    <main className="app">
      <header>
        <div>
          <div className="eyebrow">CRYPTO SIGNALS · 20 MONEDAS</div>
          <h1>Fractal2</h1>
          <p className="subtitle">RSI 14 + MACD 12/26/9 · confirmación 15m + 1h</p>
        </div>
        <div className="summary"><span>🟢 {buyCount} compras</span><span>🔴 {sellCount} ventas</span><span>⚪ {snapshots.length - buyCount - sellCount} neutras</span></div>
      </header>

      <div className="filters">
        {['ALL', 'BUY', 'SELL', 'NEUTRAL'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'ALL' ? 'Todas' : value === 'BUY' ? 'Compra' : value === 'SELL' ? 'Venta' : 'Neutras'}</button>)}
      </div>

      <section className="coin-grid">
        {visible.map((snapshot) => <CoinCard key={snapshot.symbol} snapshot={snapshot} selected={snapshot.symbol === selectedSnapshot.symbol} onSelect={setSelected} />)}
      </section>

      <Detail snapshot={selectedSnapshot} />

      <section className="rules card">
        <h2>Reglas</h2>
        <ul>
          <li>RSI 14: COMPRA cuando RSI ≤ 40 · VENTA cuando RSI ≥ 60.</li>
          <li>MACD 12/26/9: COMPRA cuando MACD está sobre su señal · VENTA cuando está debajo.</li>
          <li>Señal global verde solo cuando RSI + MACD son COMPRA en 15m y 1h.</li>
          <li>Señal global roja solo cuando RSI + MACD son VENTA en 15m y 1h.</li>
          <li>Telegram solo avisa cuando aparece una nueva señal global.</li>
        </ul>
      </section>

      <footer>Actualización automática cada 30 segundos · Datos de mercado de Binance</footer>
    </main>
  );
}
