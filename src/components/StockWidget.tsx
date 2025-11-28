import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../integrations/supabase/client';
import { format } from 'date-fns';

interface StockWidgetProps {
    symbol: string;
}

const StockWidget: React.FC<StockWidgetProps> = ({ symbol }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('1d');
    const [error, setError] = useState<string | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number | null>(null);
    const [percentChange, setPercentChange] = useState<number | null>(null);

    const ranges = [
        { label: '1D', value: '1d', interval: '5m' },
        { label: '5D', value: '5d', interval: '15m' },
        { label: '1M', value: '1mo', interval: '60m' },
        { label: '6M', value: '6mo', interval: '1d' },
        { label: '1Y', value: '1y', interval: '1wk' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const selectedRange = ranges.find(r => r.value === range) || ranges[0];
                
                const { data: responseData, error: fnError } = await supabase.functions.invoke('stock-proxy', {
                    body: { 
                        symbol: symbol.toUpperCase(),
                        range: selectedRange.value,
                        interval: selectedRange.interval
                    }
                });

                if (fnError) throw new Error(fnError.message);
                if (responseData.error) throw new Error(responseData.error);

                const result = responseData.chart.result[0];
                if (!result) throw new Error("No data found");

                const quote = result.indicators.quote[0];
                const timestamps = result.timestamp;
                const meta = result.meta;

                const chartData = timestamps.map((time: number, index: number) => ({
                    date: time * 1000,
                    price: quote.close[index],
                })).filter((item: any) => item.price !== null); // Filter out nulls from trading halts/gaps

                setData(chartData);
                
                // Set current price and changes
                const lastPrice = meta.regularMarketPrice;
                const prevClose = meta.chartPreviousClose;
                setCurrentPrice(lastPrice);
                setPriceChange(lastPrice - prevClose);
                setPercentChange(((lastPrice - prevClose) / prevClose) * 100);

            } catch (err: any) {
                console.error("Stock fetch error:", err);
                setError("Could not load stock data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, range]);

    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        if (range === '1d') return format(date, 'h:mm a');
        if (range === '5d') return format(date, 'MMM d');
        return format(date, 'MMM d');
    };

    const isPositive = (priceChange || 0) >= 0;
    const color = isPositive ? '#4ade80' : '#f87171'; // green-400 : red-400

    return (
        <div data-liquid-glass className="liquid-glass p-6 rounded-2xl w-full max-w-lg my-4 border border-white/10 shadow-2xl overflow-hidden interactive-lift">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{symbol.toUpperCase()}</h3>
                    {currentPrice && (
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-semibold text-white">${currentPrice.toFixed(2)}</span>
                            <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{priceChange?.toFixed(2)} ({isPositive ? '+' : ''}{percentChange?.toFixed(2)}%)
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex bg-black/30 rounded-lg p-1">
                    {ranges.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${range === r.value ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[250px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                ) : error ? (
                    <div className="h-full w-full flex items-center justify-center text-red-400 text-sm">
                        {error}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={formatXAxis} 
                                stroke="#52525b" 
                                tick={{fill: '#71717a', fontSize: 10}}
                                minTickGap={30}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                hide={true} 
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                labelFormatter={(label) => format(new Date(label), 'MMM d, h:mm a')}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="price" 
                                stroke={color} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorPrice)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="mt-2 text-right">
                 <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Real-time Data • Market Open</span>
            </div>
        </div>
    );
};

export default StockWidget;