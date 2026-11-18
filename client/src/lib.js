// Helpers: weather codes, formatting, advice logic, sample data, API
export const WMO={0:['Clear sky','☀️'],1:['Mostly clear','🌤️'],2:['Partly cloudy','⛅'],3:['Overcast','☁️'],45:['Fog','🌫️'],48:['Freezing fog','🌫️'],51:['Light drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy drizzle','🌧️'],56:['Freezing drizzle','🌧️'],57:['Freezing drizzle','🌧️'],61:['Light rain','🌦️'],63:['Rain','🌧️'],65:['Heavy rain','🌧️'],66:['Freezing rain','🌧️'],67:['Freezing rain','🌧️'],71:['Light snow','🌨️'],73:['Snow','🌨️'],75:['Heavy snow','❄️'],77:['Snow grains','❄️'],80:['Rain showers','🌦️'],81:['Rain showers','🌧️'],82:['Violent showers','⛈️'],85:['Snow showers','🌨️'],86:['Snow showers','❄️'],95:['Thunderstorm','⛈️'],96:['Thunderstorm, hail','⛈️'],99:['Thunderstorm, hail','⛈️']};
export function demo(){
  const n=new Date(),p=x=>String(x).padStart(2,'0'),ds=(d)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  const hourly={time:[],temperature_2m:[],apparent_temperature:[],precipitation_probability:[],wind_speed_10m:[]};
  for(let i=0;i<24*7;i++){const d=new Date(n.getFullYear(),n.getMonth(),n.getDate(),i);const h=d.getHours(),t=17+7*Math.sin((h-9)/24*Math.PI*2);
    hourly.time.push(ds(d)+`T${p(h)}:00`);hourly.temperature_2m.push(t);hourly.apparent_temperature.push(t-1);hourly.precipitation_probability.push(h>17&&h<22?55:10);hourly.wind_speed_10m.push(9)}
  const daily={time:[],weather_code:[],temperature_2m_max:[],temperature_2m_min:[],precipitation_probability_max:[],uv_index_max:[],sunrise:[],sunset:[]};
  for(let i=0;i<7;i++){const d=new Date(n.getFullYear(),n.getMonth(),n.getDate()+i);daily.time.push(ds(d));daily.weather_code.push([1,2,3,61,0,2,1][i]);daily.temperature_2m_max.push(23+i%3);daily.temperature_2m_min.push(11+i%2);daily.precipitation_probability_max.push([10,20,30,70,5,15,10][i]);daily.uv_index_max.push(5);daily.sunrise.push(ds(d)+'T06:40');daily.sunset.push(ds(d)+'T17:35')}
  return{current:{time:ds(n)+`T${p(n.getHours())}:00`,temperature_2m:20,apparent_temperature:19,relative_humidity_2m:50,weather_code:2,wind_speed_10m:9,is_day:n.getHours()>6&&n.getHours()<18?1:0},hourly,daily};
}

export const wmo = c => WMO[c] || ['Unknown', '🌡️'];
export const kind = c => [95,96,99].includes(c) ? 'storm' : (c>=71&&c<=77)||c===85||c===86 ? 'snow' : (c>=51&&c<=67)||(c>=80&&c<=82) ? 'rain' : c===45||c===48 ? 'fog' : c===3 ? 'cloud' : c===2 ? 'part' : 'clear';
export const hr = t => +t.slice(11, 13);
export const h12 = h => ((h + 11) % 12 + 1) + (h % 24 < 12 ? ' am' : ' pm');
export const clock = t => `${(hr(t) + 11) % 12 + 1}:${t.slice(14, 16)}${hr(t) < 12 ? ' am' : ' pm'}`;
export const toUnit = (c, u) => u === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c);

// Sky colours and animation settings for the current weather
export function skyTheme(d) {
  const c = d.current, k = kind(c.weather_code), day = c.is_day === 1, t = new Date(c.time);
  const near = Math.min(Math.abs(t - new Date(d.daily.sunrise[0])), Math.abs(t - new Date(d.daily.sunset[0]))) < 45 * 60000;
  let g = day ? ['#2f8bf0', '#9ad3ff'] : ['#080d24', '#26346b'];
  if (near) g = day ? ['#5b6fd6', '#ffb88a'] : ['#2a2a5e', '#f2866b'];
  if (k === 'rain' || k === 'cloud' || k === 'fog') g = day ? ['#51667a', '#9fb1c1'] : ['#141b27', '#394a5e'];
  if (k === 'storm') g = day ? ['#2d3544', '#5d6a80'] : ['#0c0f18', '#2b3347'];
  if (k === 'snow') g = day ? ['#7f94ad', '#d4e0ee'] : ['#1c2638', '#546682'];
  const rain = k === 'rain' || k === 'storm';
  return { g, m: { rain, snow: k === 'snow', storm: k === 'storm', stars: !day && !rain && k !== 'cloud', sun: day && (k === 'clear' || k === 'part'),
    cl: { clear: 0, part: 3, cloud: 7, rain: 7, storm: 8, snow: 6, fog: 9 }[k] } };
}

// Verdict, clothing advice and best time outside
export function analyse(d, unit) {
  const c = d.current, T = v => toUnit(v, unit);
  const i0 = Math.max(0, d.hourly.time.findIndex(t => t.startsWith(c.time.slice(0, 13))));
  const sl = k => d.hourly[k].slice(i0, i0 + 24);
  const temps = sl('temperature_2m'), feels = sl('apparent_temperature'), pop = sl('precipitation_probability'), wind = sl('wind_speed_10m');
  const times = d.hourly.time.slice(i0, i0 + 24);
  const k = kind(c.weather_code), f = c.apparent_temperature, rain6 = Math.max(...pop.slice(0, 6));
  const verdict = k === 'storm' ? 'Storms are around. Stay indoors if you can.' : rain6 >= 60 ? 'Rain is likely soon. Take an umbrella.'
    : f >= 36 ? 'Dangerously hot. Find shade and drink water.' : f <= 2 ? 'Freezing out there. Layer up.'
    : (k === 'clear' || k === 'part') && f >= 14 && f <= 30 ? 'A good day to be outside.' : k === 'fog' ? 'Low visibility. Take it slow.' : 'Calm and settled. No surprises today.';
  let wear, wearSub;
  if (f <= 5) [wear, wearSub] = ['Heavy coat', 'Add gloves and a hat.'];
  else if (f <= 13) [wear, wearSub] = ['Warm jacket', 'A sweater underneath will help.'];
  else if (f <= 20) [wear, wearSub] = ['Light layer', 'Easy to take off if it warms up.'];
  else if (f <= 28) [wear, wearSub] = ['T-shirt weather', 'Breathable fabrics are best.'];
  else [wear, wearSub] = ['Stay light', 'Loose cotton, a hat and water.'];
  if (rain6 >= 50) wearSub += ' Bring an umbrella or rain shell.';
  let bi = -1, bs = 1e9;
  const sc = x => pop[x] * 1.2 + Math.abs(feels[x] - 22) * 3 + wind[x];
  for (let i = 0; i < Math.min(18, temps.length - 2); i++) {
    const h = hr(times[i]); if (h < 6 || h > 19) continue;
    const s = sc(i) + sc(i + 1); if (s < bs) { bs = s; bi = i; }
  }
  let best, bestSub;
  if (bi < 0 || Math.max(pop[bi], pop[bi + 1]) > 50) [best, bestSub] = ['No dry window', 'Rain is likely through the daylight hours.'];
  else [best, bestSub] = [`${h12(hr(times[bi]))} – ${h12(hr(times[bi]) + 2)}`, `About ${T(temps[bi])}°, ${Math.round((pop[bi] + pop[bi + 1]) / 2)}% rain chance.`];
  const uv = d.daily.uv_index_max[0];
  const uvText = `UV peaks at ${Math.round(uv)}. ` + (uv >= 8 ? 'Very high: cover up.' : uv >= 6 ? 'High: wear sunscreen.' : uv >= 3 ? 'Moderate: sunscreen helps.' : 'Low.');
  return { temps, pop, times, verdict, wear, wearSub, best, bestSub, sun: `Sunset ${clock(d.daily.sunset[0])}`, uvText };
}

// Backend calls. Saved cities are keyed to an anonymous id kept in this browser.
export const deviceId = (() => {
  try { let v = localStorage.getItem('skyline-id'); if (!v) { v = crypto.randomUUID(); localStorage.setItem('skyline-id', v); } return v; }
  catch { return 'anon-' + Math.random().toString(36).slice(2, 12); }
})();
export async function api(path, opt = {}) {
  const r = await fetch('/api' + path, { ...opt, headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.status === 204 ? null : r.json();
}
