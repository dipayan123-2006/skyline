import { wmo, toUnit } from '../lib.js';

// Seven-day outlook with a range bar for each day
export default function Week({ daily, unit }) {
  const lo = Math.min(...daily.temperature_2m_min), hi = Math.max(...daily.temperature_2m_max);
  const pct = v => (v - lo) / (hi - lo || 1) * 100;
  return (
    <section className="panel">
      <h2>This week</h2>
      {daily.time.map((t, i) => {
        const a = pct(daily.temperature_2m_min[i]), b = pct(daily.temperature_2m_max[i]);
        const [name, icon] = wmo(daily.weather_code[i]);
        return (
          <div className="day" key={t}>
            <span>{i ? new Date(t + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' }) : 'Today'}</span>
            <span role="img" aria-label={name}>{icon}</span>
            <span className="rain">{daily.precipitation_probability_max[i]}%</span>
            <span className="rng"><i style={{ left: a + '%', width: Math.max(b - a, 4) + '%' }} /></span>
            <span><span className="lo">{toUnit(daily.temperature_2m_min[i], unit)}°</span> {toUnit(daily.temperature_2m_max[i], unit)}°</span>
          </div>
        );
      })}
    </section>
  );
}
