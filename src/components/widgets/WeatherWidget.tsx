import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface WeatherData {
    temperature: number;
    condition: string;
    windSpeed: number;
    humidity: number;
    city: string;
    isDay: boolean;
}

const WeatherWidget: React.FC = () => {
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                
                // Fetch weather data from Open-Meteo
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
                );
                const json = await response.json();
                
                // Reverse geocoding for city name (using a free API)
                const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const geoJson = await geoResponse.json();

                setData({
                    temperature: Math.round(json.current.temperature_2m),
                    condition: getCondition(json.current.precipitation, json.current.is_day),
                    windSpeed: json.current.wind_speed_10m,
                    humidity: json.current.relative_humidity_2m,
                    city: geoJson.city || geoJson.locality || "Unknown Location",
                    isDay: json.current.is_day === 1
                });
            } catch (err) {
                setError("Failed to fetch weather data");
            } finally {
                setLoading(false);
            }
        }, () => {
            setError("Location access denied");
            setLoading(false);
        });
    }, []);

    const getCondition = (precip: number, isDay: number) => {
        if (precip > 0) return 'Rainy';
        if (isDay) return 'Sunny';
        return 'Clear Night';
    };

    if (loading) return <div className="p-6 rounded-3xl bg-white/5 animate-pulse h-48 w-full max-w-sm" />;
    if (error) return <div className="p-4 rounded-3xl bg-red-500/10 text-red-400 text-sm">{error}</div>;
    if (!data) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 backdrop-blur-md w-full max-w-sm"
        >
            <div className="absolute top-0 right-0 p-8 opacity-20">
                 {data.isDay ? (
                    <svg className="w-32 h-32 text-yellow-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
                 ) : (
                    <svg className="w-32 h-32 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                 )}
            </div>

            <div className="relative z-10">
                <h3 className="text-zinc-300 font-medium tracking-wide text-sm uppercase">{data.city}</h3>
                <div className="flex items-start mt-2">
                    <span className="text-6xl font-bold text-white tracking-tighter">{data.temperature}°</span>
                </div>
                <div className="text-indigo-200 font-medium text-lg mt-1">{data.condition}</div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-black/20 rounded-2xl p-3 backdrop-blur-sm">
                        <div className="text-xs text-zinc-400">Wind</div>
                        <div className="text-white font-semibold">{data.windSpeed} mph</div>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-3 backdrop-blur-sm">
                        <div className="text-xs text-zinc-400">Humidity</div>
                        <div className="text-white font-semibold">{data.humidity}%</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default WeatherWidget;