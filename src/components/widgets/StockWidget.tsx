import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

// Simulating realistic stock movement
const generateData = (startPrice: number) => {
    const data = [];
    let price = startPrice;
    for (let i = 0; i < 50; i++) {
        const change = (Math.random() - 0.48) * 5; // Slight upward bias
        price += change;
        data.push({
            time: `${10 + Math.floor(i/12)}:${(i%12)*5}`.replace(/:0$/, ':00').replace(/:5$/, ':05'),
            price: Number(price.toFixed(2))
        });
    }
    return data;
};

const StockWidget: React.FC<{ symbol?: string }> = ({ symbol = "NVDA" }) => {
    const [data, setData] = useState<any[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [startPrice, setStartPrice] = useState(0);

    useEffect(() => {
        // Initial data generation
        const basePrice = symbol === "NVDA" ? 850 : symbol === "AAPL" ? 175 : 420;
        const initialData = generateData(basePrice);
        setData(initialData);
        setStartPrice(initialData[0].price);
        setCurrentPrice(initialData[initialData.length - 1].price);

        // Live update simulation
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                const newPrice = Number((last.price + (Math.random() - 0.5) * 2).toFixed(2));
                const newTime = "Live"; 
                const newData = [...prev.slice(1), { time: newTime, price: newPrice }];
                setCurrentPrice(newPrice);
                return newData;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [symbol]);

    if (data.length === 0) return null;

    const percentChange = ((currentPrice - startPrice) / startPrice) * 100;
    const isPositive = percentChange >= 0;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 backdrop-blur-xl shadow-2xl"
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-white border border-white/10">
                            {symbol[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg tracking-tight">{symbol}</h3>
                            <p className="text-xs text-zinc-500 uppercase">Nasdaq • Realtime</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-medium text-white">${currentPrice.toFixed(2)}</div>
                    <div className={`text-sm font-medium flex items-center justify-end gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`color${symbol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={isPositive ? "#4ade80" : "#f87171"} 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill={`url(#color${symbol})`} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex justify-between mt-4">
                {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((time, i) => (
                    <button key={time} className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${i === 0 ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}>
                        {time}
                    </button>
                ))}
            </div>
        </motion.div>
    );
};

export default StockWidget;