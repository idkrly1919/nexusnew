import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface WeatherWidgetProps {
    locationQuery?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ locationQuery }) => {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            setError(null);

            try {
                let lat, lon;

                // 1. Resolve Location
                if (locationQuery && locationQuery.toLowerCase() !== 'current location') {
                    // Geocoding
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`);
                    const geoData = await geoRes.json();
                    
                    if (!geoData.results || geoData.results.length === 0) {
                        throw new Error(`Location "${locationQuery}" not found.`);
                    }
                    lat = geoData.results[0].latitude;
                    lon = geoData.results[0].longitude;
                    setLocationName(`${geoData.results[0].name}, ${geoData.results[0].country_code.toUpperCase()}`);
                } else {
                    // Browser Geolocation
                    try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject);
                        });
                        lat = position.coords.latitude;
                        lon = position.coords.longitude;
                        setLocationName("Current Location");
                    } catch (e) {
                        throw new Error("Location access denied. Please specify a city.");
                    }
                }

                // 2. Fetch Weather Data
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
                );
                
                if (!weatherRes.ok) throw new Error("Failed to fetch weather data.");
                
                const data = await weatherRes.json();
                setWeather(data);

            } catch (err: any) {
                console.error("Weather error:", err);
                setError(err.message || "Could not load weather.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [locationQuery]);

    // WMO Weather interpretation codes (http://www.odba.eu/wmo-weather-codes/)
    const getWeatherIcon = (code: number, isDay: number = 1) => {
        if (code === 0) return isDay ? '☀️' : '🌙'; // Clear
        if (code === 1 || code === 2 || code === 3) return isDay ? 'g⛅' : '☁️'; // Partly cloudy
        if (code === 45 || code === 48) return '🌫️'; // Fog
        if (code >= 51 && code <= 67) return '🌧️'; // Drizzle / Rain
        if (code >= 71 && code <= 77) return '❄️'; // Snow
        if (code >= 80 && code <= 82) return 'Showers'; // Rain showers
        if (code >= 95) return '⚡'; // Thunderstorm
        return 'UNKNOWN';
    };
    
    const getWeatherDesc = (code: number) => {
         const codes: {[key: number]: string} = {
             0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
             45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
             55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
             71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 95: 'Thunderstorm'
         };
         return codes[code] || 'Unknown';
    };

    if (loading) {
         return (
            <div data-liquid-glass className="liquid-glass p-6 rounded-2xl w-full max-w-sm my-4 flex items-center justify-center h-48">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
         );
    }

    if (error) {
        return (
            <div data-liquid-glass className="liquid-glass p-4 rounded-xl w-full max-w-sm my-4 border border-red-500/30 text-red-400 text-sm">
                Error: {error}
            </div>
        );
    }

    if (!weather) return null;

    const current = weather.current;
    const daily = weather.daily;

    return (
        <div data-liquid-glass className="liquid-glass rounded-3xl w-full max-w-sm my-4 overflow-hidden shadow-2xl interactive-lift border border-white/10">
            {/* Main Current Weather */}
            <div className={`p-6 bg-gradient-to-br ${current.is_day ? 'from-blue-500/20 to-cyan-500/20' : 'from-indigo-900/40 to-purple-900/40'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {locationName}
                        </h3>
                        <p className="text-zinc-400 text-xs">{format(new Date(), 'EEEE, MMMM d')}</p>
                    </div>
                    <div className="text-4xl">{getWeatherIcon(current.weather_code, current.is_day)}</div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                    <span className="text-6xl font-bold text-white tracking-tighter">{Math.round(current.temperature_2m)}°</span>
                    <div className="mb-2">
                        <p className="text-xl font-medium text-zinc-200">{getWeatherDesc(current.weather_code)}</p>
                        <p className="text-sm text-zinc-400">Feels like {Math.round(current.apparent_temperature)}°</p>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-px bg-white/5">
                <div className="p-4 bg-black/20 flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Wind</span>
                    <span className="text-white font-semibold">{current.wind_speed_10m} km/h</span>
                </div>
                <div className="p-4 bg-black/20 flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Humidity</span>
                    <span className="text-white font-semibold">{current.relative_humidity_2m}%</span>
                </div>
            </div>

            {/* Forecast */}
            <div className="p-4 bg-black/10 space-y-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">3-Day Forecast</p>
                {daily.time.slice(1, 4).map((date: string, i: number) => (
                    <div key={date} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300 w-12">{format(new Date(date), 'EEE')}</span>
                        <div className="flex-1 flex items-center justify-center gap-2">
                            <span>{getWeatherIcon(daily.weather_code[i+1])}</span>
                            <span className="text-zinc-400 text-xs">{getWeatherDesc(daily.weather_code[i+1])}</span>
                        </div>
                        <div className="flex gap-3 w-20 justify-end">
                            <span className="text-white font-medium">{Math.round(daily.temperature_2m_max[i+1])}°</span>
                            <span className="text-zinc-500">{Math.round(daily.temperature_2m_min[i+1])}°</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherWidget;