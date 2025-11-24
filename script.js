/* script.js
   Next-Level Weather App (consolidated + animated SVG icons)
   - Uses the original Next-Level app logic, plus animated SVG icons integrated.
   - Keep your OpenWeatherMap API key in API_KEY below.
   - All original functions preserved, minor internals adjusted to avoid duplicates/conflicts.
*/

const API_KEY = "055fd638d3b81a1b2c26ed33c00cada6"; // <-- REPLACE with your OpenWeatherMap key
const USE_HTTP = false; // if you get network errors, set to true (http). Try false first.

const app = document.getElementById("app");
const mainCard = document.getElementById("mainCard");
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("desc");
const cityNameEl = document.getElementById("cityName");
const timeLocalEl = document.getElementById("timeLocal");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");
const weatherIcon = document.getElementById("weatherIcon");
const loader = document.getElementById("loader");
const errorEl = document.getElementById("error");
const forecastCards = document.getElementById("forecastCards");
const particleLayer = document.getElementById("particleLayer");
const unitSelect = document.getElementById("unitSelect");

const themeToggle = document.getElementById("themeToggle");
const styleToggle = document.getElementById("styleToggle");

const voiceBtn = document.getElementById("voiceBtn");
const locBtn = document.getElementById("locBtn");

// utils
const protocol = USE_HTTP ? "http" : "https";
const baseWeatherUrl = `${protocol}://api.openweathermap.org/data/2.5/weather`;
const baseForecastUrl = `${protocol}://api.openweathermap.org/data/2.5/forecast`; // 5-day, 3-hour steps

// initial state
let units = unitSelect ? unitSelect.value || "metric" : "metric";
let lastSearch = null;
let isListening = false;
let recognition = null;

// small helpers
function showLoader(on = true){
  if(!loader) return;
  loader.classList.toggle("hidden", !on);
}
function showError(msg){
  if(!errorEl) return;
  errorEl.textContent = msg || "";
  errorEl.style.display = msg ? "block" : "none";
}
function setCityText(city) {
  if(!cityNameEl) return;
  cityNameEl.textContent = city || "—";
}
function formatTemp(temp){
  const rounded = Math.round(temp);
  return `${rounded}${units === "metric" ? "°C" : "°F"}`;
}
function formatTimeFromTimestamp(ts, tzOffset = 0){
  // ts in seconds; tzOffset in seconds (from API)
  const date = new Date((ts + tzOffset) * 1000);
  return date.toLocaleString([], {hour: '2-digit', minute:'2-digit', weekday: 'short', day:'numeric', month:'short'});
}

// map weather to simpler group for UI
function weatherMainGroup(main){
  main = (main || "").toLowerCase();
  if(main.includes("clear")) return "clear";
  if(main.includes("cloud")) return "clouds";
  if(main.includes("rain")) return "rain";
  if(main.includes("drizzle")) return "rain";
  if(main.includes("thunder")) return "thunder";
  if(main.includes("snow")) return "snow";
  return "mist";
}

function applyWeatherBackground(group){
  // remove any existing weather class on body
  document.body.classList.remove("clear-bg","rain-bg","cloud-bg","snow-bg","thunder-bg","mist-bg");
  switch(group){
    case "clear": document.body.classList.add("clear-bg"); break;
    case "clouds": document.body.classList.add("cloud-bg"); break;
    case "rain": document.body.classList.add("rain-bg"); break;
    case "snow": document.body.classList.add("snow-bg"); break;
    case "thunder": document.body.classList.add("thunder-bg"); break;
    default: document.body.classList.add("mist-bg"); break;
  }
}

// particle effects manager
function clearParticles(){
  if(!particleLayer) return;
  particleLayer.innerHTML = "";
}
function createClouds(){
  clearParticles();
  for(let i=0;i<3;i++){
    const c = document.createElement("div");
    c.className = "cloud particle";
    c.style.position = "absolute";
    c.style.width = `${120 + i*40}px`;
    c.style.height = `${50 + i*8}px`;
    c.style.left = `${10 + i*25}%`;
    c.style.top = `${10 + i*20}%`;
    c.style.opacity = 0.12 + i*0.05;
    c.style.background = "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.85))";
    c.style.borderRadius = "50px";
    c.style.filter = "blur(8px)";
    c.style.transform = `translateY(${i*6}px)`;
    c.style.animation = `cloudDrift ${18 + i*6}s linear infinite`;
    particleLayer.appendChild(c);
  }
}
function createRain(){
  clearParticles();
  for(let i=0;i<50;i++){
    const d = document.createElement("div");
    d.className = "drop particle";
    d.style.position = "absolute";
    d.style.width = "2px";
    d.style.height = `${8 + Math.random()*12}px`;
    d.style.left = `${Math.random()*100}%`;
    d.style.top = `${Math.random()*20 - 10}%`;
    d.style.background = "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55))";
    d.style.opacity = 0.6;
    d.style.borderRadius = "2px";
    d.style.transform = `skewX(-10deg)`;
    d.style.animation = `rainFall ${0.6 + Math.random()*0.8}s linear infinite`;
    d.style.animationDelay = `${Math.random()*1.2}s`;
    particleLayer.appendChild(d);
  }
}
function createSnow(){
  clearParticles();
  for(let i=0;i<35;i++){
    const s = document.createElement("div");
    s.className = "snow particle";
    s.style.position = "absolute";
    const size = 6 + Math.random()*8;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.left = `${Math.random()*100}%`;
    s.style.top = `${Math.random()*20 - 10}%`;
    s.style.background = "rgba(255,255,255,0.9)";
    s.style.borderRadius = "50%";
    s.style.opacity = 0.9;
    s.style.animation = `snowFall ${5 + Math.random()*6}s linear infinite`;
    s.style.animationDelay = `${Math.random()*2}s`;
    particleLayer.appendChild(s);
  }
}
function createThunder(){
  clearParticles();
  const flash = document.createElement("div");
  flash.className = "flash particle";
  flash.style.position = "absolute";
  flash.style.inset = "0";
  flash.style.background = "rgba(255,255,255,0)";
  flash.style.pointerEvents = "none";
  flash.style.animation = "lightning 4s linear infinite";
  particleLayer.appendChild(flash);
}
function createMist(){
  clearParticles();
  for(let i=0;i<6;i++){
    const m = document.createElement("div");
    m.className = "mist particle";
    m.style.position = "absolute";
    m.style.width = `${160 + Math.random()*240}px`;
    m.style.height = "60px";
    m.style.left = `${Math.random()*80 - 5}%`;
    m.style.top = `${60 + i*6}px`;
    m.style.background = "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))";
    m.style.filter = "blur(10px)";
    m.style.opacity = 0.12;
    m.style.borderRadius = "50px";
    m.style.animation = `mistDrift ${20 + Math.random()*20}s linear infinite`;
    particleLayer.appendChild(m);
  }
}

// create appropriate particle effect based on group
function applyParticles(group){
  switch(group){
    case "clear": clearParticles(); break;
    case "clouds": createClouds(); break;
    case "rain": createRain(); break;
    case "snow": createSnow(); break;
    case "thunder": createThunder(); break;
    default: createMist(); break;
  }
}

/* CSS animations (injected so we don't change CSS file) */
(function injectParticleStyles(){
  const css = `
    @keyframes cloudDrift { to{ transform: translateX(40px) } }
    @keyframes rainFall { to{ transform: translateY(180px); opacity:0 } }
    @keyframes snowFall { to{ transform: translateY(260px) rotate(20deg); opacity:0.2 } }
    @keyframes mistDrift { to{ transform: translateX(60px); opacity:0.08 } }
    @keyframes lightning {
      0%, 80% { background: rgba(255,255,255,0) }
      82% { background: rgba(255,255,255,0.6) }
      85% { background: rgba(255,255,255,0) }
      92% { background: rgba(255,255,255,0.25) }
      95% { background: rgba(255,255,255,0) }
    }
  `;
  const s = document.createElement('style');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

/* Animated SVG Icons
   (Integrated — used in populateCurrent if a matching icon exists)
*/

// ☀️ Clear Sky
const svgClear = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <circle class="sun-core" cx="32" cy="32" r="12" fill="#FFD93D"/>
  <g class="sun-rays" stroke="#FFD93D" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="4"  x2="32" y2="14"/>
    <line x1="32" y1="50" x2="32" y2="60"/>
    <line x1="4"  y1="32" x2="14" y2="32"/>
    <line x1="50" y1="32" x2="60" y2="32"/>
    <line x1="12" y1="12" x2="18" y2="18"/>
    <line x1="46" y1="46" x2="52" y2="52"/>
    <line x1="12" y1="52" x2="18" y2="46"/>
    <line x1="46" y1="18" x2="52" y2="12"/>
  </g>
</svg>`;

// ☁️ Clouds
const svgCloud = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#e0e7ff">
    <circle cx="22" cy="34" r="12"/>
    <circle cx="34" cy="30" r="14"/>
    <circle cx="46" cy="34" r="10"/>
  </g>
</svg>`;

// 🌧 Rain
const svgRain = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <g fill="#d0d7ff">
    <circle cx="26" cy="28" r="12"/>
    <circle cx="40" cy="28" r="12"/>
  </g>
  <line class="raindrop" x1="22" y1="42" x2="22" y2="55" stroke="#9ecbff" stroke-width="4" stroke-linecap="round"/>
  <line class="raindrop" x1="32" y1="42" x2="32" y2="55" stroke="#9ecbff" stroke-width="4" stroke-linecap="round"/>
  <line class="raindrop" x1="42" y1="42" x2="42" y2="55" stroke="#9ecbff" stroke-width="4" stroke-linecap="round"/>
</svg>`;

// 🌨 Snow
const svgSnow = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <g fill="#e0f7ff">
    <circle cx="26" cy="28" r="12"/>
    <circle cx="40" cy="28" r="12"/>
  </g>
  <text class="snowflake" x="22" y="50" font-size="18">❄</text>
  <text class="snowflake" x="32" y="50" font-size="18">❄</text>
  <text class="snowflake" x="42" y="50" font-size="18">❄</text>
</svg>`;

// 🌩 Thunder
const svgThunder = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <g fill="#d0d7ff">
    <circle cx="24" cy="28" r="12"/>
    <circle cx="40" cy="28" r="14"/>
  </g>
  <polygon class="bolt" points="32,34 26,48 34,48 30,60 42,42 34,42" fill="#ffe066"/>
</svg>`;

// 🌫 Mist
const svgMist = `
<svg viewBox="0 0 64 64" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#d0d7ff" stroke-width="4" stroke-linecap="round" opacity=".7">
    <line x1="12" y1="24" x2="52" y2="24"/>
    <line x1="8"  y1="34" x2="56" y2="34"/>
    <line x1="14" y1="44" x2="50" y2="44"/>
  </g>
</svg>`;

const ICONS = {
  Clear: svgClear,
  Clouds: svgCloud,
  Rain: svgRain,
  Drizzle: svgRain,
  Snow: svgSnow,
  Thunderstorm: svgThunder,
  Mist: svgMist,
  Fog: svgMist,
  Smoke: svgMist,
  Haze: svgMist,
};

/* UI update helpers */
function populateCurrent(data){
  if(!data) return;
  const main = data.weather[0].main;
  const desc = data.weather[0].description;
  const icon = data.weather[0].icon;
  const temp = data.main.temp;
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const pressure = data.main.pressure;
  const name = `${data.name}, ${data.sys?.country || ''}`;
  const tzOffset = data.timezone; // seconds
  const localTs = Math.floor(Date.now() / 1000);

  setCityText(name);
  if(timeLocalEl) timeLocalEl.textContent = formatTimeFromTimestamp(localTs, tzOffset);
  if(tempEl) tempEl.textContent = formatTemp(temp);
  if(descEl) descEl.textContent = desc;
  if(humidityEl) humidityEl.textContent = `${humidity}%`;
  if(windEl) windEl.textContent = units === "metric" ? `${wind} m/s` : `${wind} mph`;
  if(pressureEl) pressureEl.textContent = `${pressure} hPa`;

  // set animated SVG if available, else fallback to OpenWeather icon image
  if(weatherIcon){
    const sv = ICONS[main];
    if(sv){
      weatherIcon.innerHTML = sv;
      weatherIcon.classList.remove("hidden");
      weatherIcon.style.transform = "translateY(-6px)";
    } else {
      // fallback to image
      weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${icon}@4x.png" alt="${desc}" />`;
      weatherIcon.classList.remove("hidden");
      const img = weatherIcon.querySelector("img");
      if(img) img.style.width = "120px";
    }
  }

  // background + particles
  const group = weatherMainGroup(main);
  applyWeatherBackground(group);
  applyParticles(group);
}

/* Forecast parsing:
   OpenWeatherMap /forecast returns 3-hour slots for 5 days.
   We'll group by day and take min/max + midday icon.
*/
function buildForecast(forecastData){
  // group by date (local)
  const tzOffset = forecastData.city?.timezone || 0;
  const list = forecastData.list || [];

  const byDay = {}; // YYYY-MM-DD -> array of entries
  list.forEach(item => {
    // compute local day using dt + tzOffset
    const localTs = item.dt + tzOffset;
    const d = new Date(localTs * 1000);
    const dayKey = d.toISOString().slice(0,10);
    if(!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(item);
  });

  // pick next 5 days (exclude today if partial) - preserve order
  const keys = Object.keys(byDay).slice(0,6); // sometimes includes partial today; we'll take up to 5 future days
  const cards = [];
  for(let i=0; i<keys.length && cards.length<5; i++){
    const arr = byDay[keys[i]];
    // compute min/max temp
    const temps = arr.map(a => a.main.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    // pick icon from midday entry if exists else first
    const midday = arr[Math.floor(arr.length/2)] || arr[0];
    const icon = midday.weather[0].icon;
    const desc = midday.weather[0].description;
    // readable day label
    const d = new Date((midday.dt + (forecastData.city?.timezone || 0)) * 1000);
    const dayLabel = d.toLocaleString([], {weekday:'short', day:'numeric', month:'short'});
    cards.push({dayLabel, min, max, icon, desc});
  }
  return cards;
}

function renderForecast(cards){
  if(!forecastCards) return;
  forecastCards.innerHTML = "";
  cards.forEach((c, idx) => {
    const el = document.createElement("div");
    el.className = "forecast-card";
    el.style.animationDelay = `${idx * 80}ms`;
    el.innerHTML = `
      <div class="fc-day">${c.dayLabel}</div>
      <img src="https://openweathermap.org/img/wn/${c.icon}@2x.png" alt="${c.desc}" style="width:64px;height:64px;margin:6px auto;display:block" />
      <div class="fc-temp">${Math.round(c.max)} / ${Math.round(c.min)}</div>
      <div class="small muted" style="font-size:12px;margin-top:6px">${c.desc}</div>
    `;
    forecastCards.appendChild(el);
  });
}

/* Core fetch functions */
async function fetchWeatherByCity(city){
  showError();
  showLoader(true);
  if(weatherIcon) weatherIcon.classList.add("hidden");
  try{
    const url = `${baseWeatherUrl}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}`;
    const res = await fetch(url);
    const data = await res.json();
    showLoader(false);

    if(res.status === 401){
      showError("Invalid API key - check your OpenWeatherMap key.");
      return null;
    }
    if(res.status === 404 || data.cod === "404"){
      showError("City not found. Try another name.");
      return null;
    }
    if(!res.ok){
      showError(data.message || "Failed to fetch weather.");
      return null;
    }
    lastSearch = {type:"city", q:city};
    populateCurrent(data);

    // fetch forecast (by city id)
    if(data.id){
      fetchForecastByCityId(data.id);
    }
    return data;
  }catch(err){
    console.error(err);
    showLoader(false);
    showError("Network error. Check connection or API endpoint.");
    return null;
  }
}

async function fetchWeatherByCoords(lat, lon){
  showError();
  showLoader(true);
  try{
    const url = `${baseWeatherUrl}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
    const res = await fetch(url);
    const data = await res.json();
    showLoader(false);

    if(!res.ok){
      showError(data.message || "Failed fetching local weather.");
      return null;
    }
    lastSearch = {type:"coords", lat, lon};
    populateCurrent(data);

    if(data.id) fetchForecastByCityId(data.id);
    return data;
  }catch(err){
    console.error(err);
    showLoader(false);
    showError("Network error when fetching coordinates.");
    return null;
  }
}

async function fetchForecastByCityId(cityId){
  try{
    // forecast endpoint uses city name or id
    const url = `${baseForecastUrl}?id=${cityId}&appid=${API_KEY}&units=${units}`;
    const res = await fetch(url);
    const data = await res.json();
    if(!res.ok){
      console.warn("Forecast fetch failed", data);
      return;
    }
    const cards = buildForecast(data);
    renderForecast(cards);
  }catch(err){
    console.error("Forecast error", err);
  }
}

/* Events */
if(searchBtn){
  searchBtn.addEventListener("click", () => {
    const city = cityInput ? cityInput.value.trim() : "";
    if(!city) { showError("Please type a city name."); return; }
    fetchWeatherByCity(city);
  });
}

if(cityInput){
  cityInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      if(searchBtn) searchBtn.click();
    }
  });
}

if(unitSelect){
  unitSelect.addEventListener("change", () => {
    units = unitSelect.value;
    // re-fetch last search in new units
    if(lastSearch){
      if(lastSearch.type === "city") fetchWeatherByCity(lastSearch.q);
      else if(lastSearch.type === "coords") fetchWeatherByCoords(lastSearch.lat, lastSearch.lon);
    }
  });
}

/* theme toggle */
if(themeToggle){
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    themeToggle.textContent = document.body.classList.contains("light") ? "🌞" : "🌙";
  });
}

/* style toggle (glass / neumo) */
if(styleToggle){
  styleToggle.addEventListener("click", () => {
    document.body.classList.toggle("neumo");
    styleToggle.textContent = document.body.classList.contains("neumo") ? "☯" : "⇄";
  });
}

/* geolocation */
if(locBtn){
  locBtn.addEventListener("click", () => {
    if(!navigator.geolocation){
      showError("Geolocation not supported by your browser.");
      return;
    }
    showError();
    showLoader(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      const {latitude, longitude} = pos.coords;
      fetchWeatherByCoords(latitude, longitude);
    }, (err) => {
      showLoader(false);
      showError("Location permission denied or unavailable.");
    }, {timeout:10000});
  });
}

/* voice search (Web Speech) */
if(voiceBtn){
  voiceBtn.addEventListener("click", initVoice);
}

function initVoice(){
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){
    showError("Speech recognition not supported in this browser.");
    return;
  }
  showError();
  const SSR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SSR();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    isListening = true;
    voiceBtn.classList.add("listening");
    voiceBtn.textContent = "🎤...";
  };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if(cityInput) cityInput.value = text;
    fetchWeatherByCity(text);
  };
  recognition.onerror = (e) => {
    console.error(e);
    showError("Voice recognition error.");
  };
  recognition.onend = () => {
    isListening = false;
    voiceBtn.classList.remove("listening");
    voiceBtn.textContent = "🎙️";
  };
  recognition.start();
}

/* initial auto-load using geolocation (graceful fallback to sample) */
async function init(){
  // small UX: show loader while trying geolocation
  showLoader(true);
  if(navigator.geolocation){
    // try a quick permission, fallback to IP-based or default city
    let granted = false;
    try{
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((pos) => {
          granted = true;
          resolve(pos);
        }, (err) => resolve(null), {timeout:6000});
      });
    }catch(e){
      // noop
    }
    if(granted){
      navigator.geolocation.getCurrentPosition((pos) => {
        const {latitude, longitude} = pos.coords;
        fetchWeatherByCoords(latitude, longitude);
      }, () => {
        // fallback to default city
        fetchWeatherByCity("New York");
      }, {timeout:8000});
      return;
    }
  }
  // fallback: simple default
  fetchWeatherByCity("New York");
}

// run init on load
init();

/* Small accessibility: remove loader if long not loading */
setTimeout(() => showLoader(false), 8000);