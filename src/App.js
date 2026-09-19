import { useEffect, useState } from 'react';

const weatherCodes = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'], 45: ['Foggy', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Heavy showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm with hail', '⛈️'], 99: ['Thunderstorm with hail', '⛈️'],
};

const condition = (code) => weatherCodes[code] ?? ['Unknown conditions', '🌡️'];
const dayName = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));

export default function App() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('new delhi, India');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('New Delhi');

  useEffect(() => {
    const controller = new AbortController();
    async function loadWeather() {
      setLoading(true);
      setError('');
      try {
        const placeResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(submittedQuery)}&count=1&language=en&format=json`,
          { signal: controller.signal },
        );
        if (!placeResponse.ok) throw new Error('Could not find that location.');
        const placeData = await placeResponse.json();
        const place = placeData.results?.[0];
        if (!place) throw new Error('No city matched your search. Try a different name.');

        const forecastResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`,
          { signal: controller.signal },
        );
        if (!forecastResponse.ok) throw new Error('Weather service is unavailable. Please try again shortly.');
        setWeather(await forecastResponse.json());
        setLocation([place.name, place.admin1, place.country].filter(Boolean).join(', '));
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Something went wrong while loading weather.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadWeather();
    return () => controller.abort();
  }, [submittedQuery]);

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) setSubmittedQuery(query.trim());
  };

  const current = weather?.current;
  const [currentLabel, currentIcon] = condition(current?.weather_code);

  return (
    <main className="app-shell">
      <section className="weather-app" aria-live="polite">
        <header>
          <p className="eyebrow">WEATHERLY</p>
          <h1>Your day, forecaste.</h1>
          <form onSubmit={submit} className="search" role="search">
            <label htmlFor="city" className="sr-only">Search for a city</label>
            <input id="city" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a city" />
            <button type="submit">Search</button>
          </form>
        </header>

        {loading && <div className="status"><span className="spinner" /> Loading weather…</div>}
        {error && <div className="status error"><strong>Unable to load weather.</strong><span>{error}</span><button onClick={() => setSubmittedQuery(`${submittedQuery} `)}>Try again</button></div>}

        {weather && !loading && !error && (
          <>
            <section className="current-card">
              <div><p className="place">{location}</p><p className="condition">{currentLabel}</p><p className="updated">Updated now · {weather.timezone_abbreviation}</p></div>
              <div className="temperature"><span>{Math.round(current.temperature_2m)}°</span><i>{currentIcon}</i></div>
              <div className="details"><span>Feels like <b>{Math.round(current.apparent_temperature)}°</b></span><span>Humidity <b>{current.relative_humidity_2m}%</b></span><span>Wind <b>{Math.round(current.wind_speed_10m)} km/h</b></span></div>
            </section>
            <section className="forecast-section">
              <div className="section-title"><h2>5-day forecast</h2><span>High / Low</span></div>
              <div className="forecast-grid">
                {weather.daily.time.slice(0, 5).map((date, index) => {
                  const [label, icon] = condition(weather.daily.weather_code[index]);
                  return <article className="day-card" key={date}><p>{index === 0 ? 'Today' : dayName(date)}</p><span className="forecast-icon" aria-label={label}>{icon}</span><strong>{Math.round(weather.daily.temperature_2m_max[index])}°</strong><small>{Math.round(weather.daily.temperature_2m_min[index])}°</small><em>{weather.daily.precipitation_probability_max[index]}% rain</em></article>;
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
