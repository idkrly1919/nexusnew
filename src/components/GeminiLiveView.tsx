import React, { useState, useEffect, useRef } from 'react';
import { chatWithGeminiLive } from '../services/geminiService';

interface GeminiLiveViewProps {
    onClose: () => void;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseRadius: number;
    currentRadius: number;
    targetRadius: number;
    hue: number;
    phase: number;
}

const GeminiLiveView: React.FC<GeminiLiveViewProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'listening' | 'processing' | 'speaking'>('listening');
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [history, setHistory] = useState<{role: string, message: string}[]>([]);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);

    // Initialize Speech Recognition
    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!SpeechRecognition) {
            setError("Browser doesn't support speech recognition.");
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
            if (status !== 'listening') return;

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            
            const currentTranscript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');

            setTranscript(currentTranscript);

            // 1.5s silence triggers send
            silenceTimerRef.current = setTimeout(() => {
                if (currentTranscript.trim()) {
                    handleUserTurn(currentTranscript.trim());
                }
            }, 1500);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech error", event.error);
            if (event.error === 'not-allowed') setError("Microphone blocked.");
        };

        startListening();

        return () => {
            stopListening();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    // Initialize Visualizer
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.fftSize = 128; 
                analyserRef.current.smoothingTimeConstant = 0.85;
                drawVisualizer();
            })
            .catch(err => console.error("Mic error for visualizer:", err));

        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const startListening = () => {
        try {
            recognitionRef.current?.start();
            setStatus('listening');
            setTranscript('');
        } catch (e) {
            // Already started
        }
    };

    const stopListening = () => {
        try {
            recognitionRef.current?.stop();
        } catch (e) {}
    };

    const handleUserTurn = async (text: string) => {
        stopListening();
        setStatus('processing');
        
        // Optimistic UI
        setHistory(prev => [...prev, { role: 'User', message: text }]);

        try {
            const aiResponse = await chatWithGeminiLive(history, text);
            setResponse(aiResponse);
            setHistory(prev => [...prev, { role: 'Quillix', message: aiResponse }]);
            speak(aiResponse);
        } catch (e) {
            console.error(e);
            setStatus('listening');
            startListening();
        }
    };

    const speak = (text: string) => {
        setStatus('speaking');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; 
        
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
            setStatus('listening');
            setTranscript('');
            startListening();
        };

        synthRef.current.speak(utterance);
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize particles if empty
        if (particlesRef.current.length === 0) {
            const particleCount = 20; 
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5,
                    baseRadius: Math.random() * 25 + 15,
                    currentRadius: Math.random() * 25 + 15,
                    targetRadius: Math.random() * 25 + 15,
                    hue: 200 + Math.random() * 60, // Blue-Purple range
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            
            // Get Mic Data
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Physics & Drawing Loop
            particlesRef.current.forEach((p, i) => {
                // 1. Determine "Audio Value" based on state
                let audioValue = 0;
                
                if (status === 'listening') {
                    // Map particle to a frequency band
                    const index = Math.floor((i / particlesRef.current.length) * (bufferLength / 2));
                    audioValue = dataArray[index] || 0;
                } else if (status === 'speaking') {
                    // Simulate voice waveform using sine waves + time
                    const time = Date.now() / 150;
                    // Create a dynamic, voice-like modulation
                    const noise = Math.sin(time + p.phase) * Math.cos(time * 0.5 + i);
                    const amplitude = Math.max(0, noise); 
                    audioValue = amplitude * 200; // Simulated 0-200 range
                } else {
                    // Processing: subtle pulse
                    const time = Date.now() / 500;
                    audioValue = (Math.sin(time + p.phase) + 1) * 20; 
                }

                // 2. Reactivity: Target Radius
                const sensitivity = status === 'processing' ? 0.2 : 0.8;
                const sizeOffset = (audioValue / 255) * 60 * sensitivity; 
                p.targetRadius = p.baseRadius + sizeOffset;
                
                // Smooth transition to target
                p.currentRadius += (p.targetRadius - p.currentRadius) * 0.15;

                // 3. Movement
                p.x += p.vx;
                p.y += p.vy;

                // Wall bouncing
                if (p.x < 0 + p.currentRadius) { p.x = p.currentRadius; p.vx *= -1; }
                if (p.x > canvas.width - p.currentRadius) { p.x = canvas.width - p.currentRadius; p.vx *= -1; }
                if (p.y < 0 + p.currentRadius) { p.y = p.currentRadius; p.vy *= -1; }
                if (p.y > canvas.height - p.currentRadius) { p.y = canvas.height - p.currentRadius; p.vy *= -1; }

                // 4. Draw Liquid Glass Orb
                ctx.beginPath();
                const r = Math.max(0, p.currentRadius);
                
                // Colors based on status
                let hue = p.hue;
                let saturation = 80;
                let lightness = 60;
                
                if (status === 'speaking') {
                    hue = 260 + (audioValue / 255) * 40; // Purple to Pink
                    lightness = 70;
                } else if (status === 'listening') {
                    hue = 140 + (audioValue / 255) * 60; // Green to Teal
                } else {
                    hue = 200; // Blue (Thinking)
                    lightness = 80;
                    saturation = 40;
                }

                const gradient = ctx.createRadialGradient(
                    p.x - r * 0.3, p.y - r * 0.3, r * 0.1,
                    p.x, p.y, r
                );

                gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 95%, 0.9)`); // Highlight
                gradient.addColorStop(0.4, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`); // Body
                gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.1)`); // Edge

                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Glass Reflection/Shine
                ctx.beginPath();
                ctx.ellipse(p.x - r*0.3, p.y - r*0.3, r*0.25, r*0.15, Math.PI / 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();

                // Rim
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = `hsla(${hue}, ${saturation}%, 90%, 0.3)`;
                ctx.stroke();
            });
        };
        draw();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 ${status === 'speaking' ? 'bg-indigo-500/20 scale-110' : status === 'listening' ? 'bg-emerald-500/10 scale-100' : 'bg-blue-500/10 scale-90'}`}></div>
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'listening' ? 'bg-emerald-400' : status === 'speaking' ? 'bg-indigo-400' : 'bg-white'}`}></div>
                    <span className="text-zinc-200 font-medium text-sm tracking-wide">Quillix Voice</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors group">
                    <svg className="group-hover:rotate-90 transition-transform duration-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Fullscreen Canvas */}
            <div className="absolute inset-0">
                <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full block" />
            </div>

            {/* Text Overlay */}
            <div className="absolute bottom-40 left-0 right-0 text-center max-w-3xl mx-auto px-6 z-20 pointer-events-none">
                {error ? (
                    <p className="text-red-400 text-lg bg-black/50 p-4 rounded-xl backdrop-blur-sm inline-block">{error}</p>
                ) : (
                    <div className={`transition-all duration-500 ${status !== 'listening' && !response ? 'opacity-0' : 'opacity-100'}`}>
                        <p className="text-3xl md:text-4xl font-light text-white leading-relaxed drop-shadow-xl">
                            {status === 'listening' ? (transcript || "Listening...") : 
                             status === 'processing' ? "Thinking..." : 
                             response}
                        </p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 flex items-center justify-center gap-8 z-20 w-full">
                <button 
                    onClick={() => setStatus(s => s === 'listening' ? 'processing' : 'listening')} 
                    className={`p-6 rounded-full transition-all duration-300 shadow-2xl backdrop-blur-xl border border-white/20 hover:scale-105 active:scale-95 ${status === 'listening' ? 'bg-red-500/80 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {status === 'listening' ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default GeminiLiveView;