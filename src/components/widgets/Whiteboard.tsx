import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Point { x: number; y: number }
interface Path { points: Point[]; color: string; width: number }

const Whiteboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(3);
    const [paths, setPaths] = useState<Path[]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Handle resizing
        const resize = () => {
            const parent = canvas.parentElement;
            if(parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                redraw();
            }
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => { redraw(); }, [paths, currentPath]);

    const redraw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw saved paths
        paths.forEach(path => {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width;
            if(path.points.length > 0) {
                ctx.moveTo(path.points[0].x, path.points[0].y);
                path.points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            }
        });

        // Draw current path
        if (currentPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSize;
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const pos = getPos(e);
        setCurrentPath([pos]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const pos = getPos(e);
        setCurrentPath(prev => [...prev, pos]);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setPaths(prev => [...prev, { points: currentPath, color, width: brushSize }]);
        setCurrentPath([]);
    };

    const clear = () => setPaths([]);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
            <div className="w-full max-w-5xl h-[80vh] bg-[#111] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
                {/* Toolbar */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#18181b]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg">
                            {['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                        <div className="h-8 w-[1px] bg-white/10"></div>
                         <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24 accent-indigo-500" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={clear} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Clear</button>
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20">Done</button>
                    </div>
                </div>
                
                {/* Canvas Area */}
                <div className="flex-1 relative cursor-crosshair bg-[radial-gradient(circle_at_1px_1px,#333_1px,transparent_0)] [background-size:20px_20px]">
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="absolute inset-0 w-full h-full touch-none"
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default Whiteboard;