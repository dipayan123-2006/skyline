import { useEffect, useRef } from 'react';

// Full-screen animated sky drawn on a canvas. `m` describes what to draw.
export default function Sky({ m }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, cx = cv.getContext('2d'), R = Math.random;
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let w, h, raf, flash = 0;
    const size = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; };
    size(); addEventListener('resize', size);
    const parts = Array.from({ length: m.rain ? 170 : m.snow ? 110 : 0 }, () => ({ x: R() * w, y: R() * h, v: m.rain ? 9 + R() * 8 : 1 + R() * 1.5, r: R() * 2 + 1 }));
    const clouds = Array.from({ length: m.cl }, () => ({ x: R() * w, y: R() * h * .55, s: 60 + R() * 90, v: .1 + R() * .25 }));
    const stars = m.stars ? Array.from({ length: 90 }, () => ({ x: R() * w, y: R() * h * .7, p: R() * 6 })) : [];
    const frame = n => {
      cx.clearRect(0, 0, w, h);
      if (m.sun) { const g = cx.createRadialGradient(w * .8, h * .12, 0, w * .8, h * .12, 260); g.addColorStop(0, 'rgba(255,248,210,.95)'); g.addColorStop(.25, 'rgba(255,240,180,.35)'); g.addColorStop(1, 'rgba(255,240,180,0)'); cx.fillStyle = g; cx.fillRect(0, 0, w, h); }
      stars.forEach(s => { cx.fillStyle = `rgba(255,255,255,${.4 + .5 * Math.sin(n / 700 + s.p)})`; cx.fillRect(s.x, s.y, 1.8, 1.8); });
      const a = m.storm ? .22 : .32;
      clouds.forEach(c => {
        if (!still) c.x = (c.x + c.v) % (w + 400);
        const x = c.x - 200;
        [[0, 0, 1], [.7, -.3, .8], [1.4, 0, .9], [.5, .25, .9], [1.1, .3, .7]].forEach(([dx, dy, r]) => {
          const px = x + dx * c.s, py = c.y + dy * c.s, g = cx.createRadialGradient(px, py, 0, px, py, c.s * r);
          g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          cx.fillStyle = g; cx.fillRect(px - c.s * r, py - c.s * r, c.s * 2 * r, c.s * 2 * r);
        });
      });
      if (m.rain) {
        cx.strokeStyle = 'rgba(220,235,255,.55)'; cx.lineWidth = 1.2; cx.beginPath();
        parts.forEach(p => { cx.moveTo(p.x, p.y); cx.lineTo(p.x - 2, p.y + p.v * 1.6); if (!still) { p.y += p.v; p.x -= .4; if (p.y > h) { p.y = -20; p.x = R() * w; } } });
        cx.stroke();
      }
      if (m.snow) {
        cx.fillStyle = 'rgba(255,255,255,.85)';
        parts.forEach(p => { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); if (!still) { p.y += p.v; p.x += Math.sin(n / 900 + p.r) * .4; if (p.y > h) { p.y = -5; p.x = R() * w; } } });
      }
      if (m.storm && !still) { if (flash <= 0 && R() < .004) flash = 8; if (flash > 0) { cx.fillStyle = `rgba(255,255,255,${flash / 20})`; cx.fillRect(0, 0, w, h); flash--; } }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, [m]);
  return <canvas id="sky" ref={ref} aria-hidden="true" />;
}
