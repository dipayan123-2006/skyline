import { useEffect, useMemo, useState } from 'react';
import Sky from './components/Sky.jsx';
import HourlyChart from './components/HourlyChart.jsx';
import Tiles from './components/Tiles.jsx';
import Week from './components/Week.jsx';
import { analyse, api, demo, skyTheme, toUnit, wmo } from './lib.js';

export default function App() {
  const [place, setPlace] = useState(null);   // { lat, lon, name }
  const [data, setData] = useState(null);
  const [unit, setUnit] = useState('C');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [favs, setFavs] = useState([]);

  // Ask for the visitor's location, or fall back to London with the reason shown.
  const locate = () => {
    const fallback = err => {
      const why = err && err.code === 1 ? 'Location is blocked for this site. Allow it in your browser settings.'
        : err && err.code === 3 ? 'Finding your location took too long.'
        : 'Your location isn’t available.';
      setPlace({ lat: 51.51, lon: -0.13, name: 'London, United Kingdom (location unavailable)' });
      setStatus(why + ' Showing London. Search for your city above.');
    };
    if (!navigator.geolocation) return fallback();
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      p => setPlace({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'Your location' }),
      fallback,
      { timeout: 20000, maximumAge: 600000 }
    );
  };
  useEffect(locate, []);

  // Load the forecast whenever the place changes.
  useEffect(() => {
    if (!place) return;
    let live = true;
    fetch(`/api/forecast?lat=${place.lat}&lon=${place.lon}`)
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(d => { if (live) { setData(d); setStatus(m => (m.startsWith('Searching') || m.startsWith('Finding') || m.startsWith('Saved') ? '' : m)); } })
      .catch(() => { if (live) { setData(demo()); setStatus('Couldn’t reach the forecast service, so you’re seeing sample data. Check your connection and search again.'); } });
    return () => { live = false; };
  }, [place]);

  const loadFavs = () => api('/favorites').then(setFavs).catch(() => setFavs([]));
  useEffect(() => { loadFavs(); }, []);

  const theme = useMemo(() => data && skyTheme(data), [data]);
  const a = useMemo(() => data && analyse(data, unit), [data, unit]);
  useEffect(() => {
    if (!theme) return;
    document.body.style.setProperty('--a', theme.g[0]);
    document.body.style.setProperty('--b', theme.g[1]);
  }, [theme]);

  const search = async e => {
    e.preventDefault();
    const q = query.trim(); if (!q) return;
    setStatus('Searching…');
    try {
      const r = await (await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)).json();
      if (!r.results) return setStatus(`No city found for “${q}”. Check the spelling or try a larger nearby city.`);
      const p = r.results[0];
      setPlace({ lat: p.latitude, lon: p.longitude, name: [p.name, p.admin1, p.country].filter(Boolean).join(', ') });
    } catch { setStatus('Search needs an internet connection. Try again once you’re online.'); }
  };
  const save = async () => {
    if (!place) return;
    try { await api('/favorites', { method: 'POST', body: JSON.stringify(place) }); setStatus(`Saved ${place.name}.`); loadFavs(); }
    catch (err) { setStatus(err.message); }
  };
  const remove = async id => {
    try { await api('/favorites/' + id, { method: 'DELETE' }); loadFavs(); } catch (err) { setStatus(err.message); }
  };

  const c = data?.current;
  return (
    <>
      {theme && <Sky m={theme.m} />}
      <main>
        <form className="bar" onSubmit={search} role="search">
          <input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Search a city" aria-label="Search a city" autoComplete="off" />
          <button type="button" onClick={locate} aria-label="Use my location">Use my location</button>
          <button type="button" onClick={save} aria-label="Save this city">Save city</button>
          <button type="button" onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} aria-label="Switch units">°{unit}</button>
        </form>
        <p id="status" role="status">{status}</p>

        <section className="hero">
          <p className="place">{place ? place.name : 'Loading forecast…'}{data?.sample && ' · sample data, not live'}</p>
          {c && <>
            <div className="temp">{toUnit(c.temperature_2m, unit)}<sup>°{unit}</sup></div>
            <p className="cond">{wmo(c.weather_code)[0]}</p>
            <p className="meta">Feels like {toUnit(c.apparent_temperature, unit)}° · High {toUnit(data.daily.temperature_2m_max[0], unit)}° · Low {toUnit(data.daily.temperature_2m_min[0], unit)}° · Humidity {c.relative_humidity_2m}%</p>
            <p className="verdict">{a.verdict}</p>
          </>}
        </section>

        {a && <>
          <section className="panel"><h2>Next 24 hours</h2><HourlyChart temps={a.temps} pop={a.pop} times={a.times} unit={unit} /></section>
          <Tiles a={a} />
          <Week daily={data.daily} unit={unit} />
        </>}

        {favs.length > 0 && (
          <section className="panel">
            <h2>Saved cities</h2>
            <div className="chips">
              {favs.map(f => (
                <span className="chip" key={f._id}>
                  <button type="button" onClick={() => setPlace({ lat: f.lat, lon: f.lon, name: f.name })}>{f.name}</button>
                  <button type="button" className="x" aria-label={'Remove ' + f.name} onClick={() => remove(f._id)}>×</button>
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
