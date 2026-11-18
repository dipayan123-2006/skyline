import { useState } from 'react';
import { h12, hr, toUnit } from '../lib.js';

// 24-hour temperature line with rain-chance bars. Drag across it to scrub.
export default function HourlyChart({ temps, pop, times, unit }) {
  const [i, setI] = useState(null);
  const mn = Math.min(...temps), mx = Math.max(...temps);
  const X = n => 20 + n * (680 / 23), Y = v => 110 - (v - mn) / (mx - mn || 1) * 70;
  const line = temps.map((v, n) => (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
  const label = n => n ? h12(hr(times[n])) : 'Now';
  const scrub = e => {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 720;
    setI(Math.max(0, Math.min(23, Math.round((x - 20) / (680 / 23)))));
  };
  return (
    <>
      <p id="readout">{i === null ? 'Drag across the chart to scrub through the day.' : `${label(i)}: ${toUnit(temps[i], unit)}°${unit}, ${pop[i]}% chance of rain`}</p>
      <svg viewBox="0 0 720 170" role="img" aria-label="Temperature and rain chance for the next 24 hours" onPointerMove={scrub} onPointerDown={scrub}>
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
        {pop.map((v, n) => <rect key={n} x={X(n) - 9} y={150 - v * .3} width="18" height={v * .3} rx="4" fill="#fff" opacity=".35" />)}
        <path d={`${line}L${X(23)},150L${X(0)},150Z`} fill="url(#g)" opacity=".7" />
        <path d={line} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        {times.map((t, n) => n % 4 === 0 && <text key={n} x={X(n)} y="166" fontSize="12" fill="#fff" textAnchor="middle" opacity=".85">{label(n)}</text>)}
        {i !== null && <><line x1={X(i)} x2={X(i)} y1="20" y2="150" stroke="#fff" strokeOpacity=".7" /><circle cx={X(i)} cy={Y(temps[i])} r="6" fill="#fff" /></>}
      </svg>
    </>
  );
}
