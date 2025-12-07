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
    baseSize: number;
    currentSize: number;
    targetSize: number;
    color: string;
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
                analyserRef.current.fftSize = 64; // Smaller FFT size for fewer, larger blobs
                analyserRef.current.smoothingTimeConstant = 0.8;
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
        utterance.rate = 1.1; // Slightly faster for "Live" feel
        
        // Try to pick a better voice
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

        // Initialize particles
        if (particlesRef.current.length === 0) {
            const particleCount = 25;
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    baseSize: Math.random() * 20 + 10,
                    currentSize: Math.random() * 20 + 10,
                    targetSize: Math.random() * 20 + 10,
                    color: `hsla(${200 + Math.random() * 60}, 80%, 70%, 0.3)` // Blue/Purple glassy look
                });
            }
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw particles
            particlesRef.current.forEach((p, i) => {
                // Map audio data to particle index (wrapping around)
                const audioIndex = i % bufferLength;
                const audioValue = dataArray[audioIndex];
                
                // Physics Update
                p.x += p.vx;
                p.y += p.vy;

                // Bounce off walls
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Size reactivity
                let sizeFactor = 0;
                if (status === 'listening' || status === 'speaking') {
                    sizeFactor = (audioValue / 255) * 30; // Grow based on volume
                } else if (status === 'processing') {
                    sizeFactor = Math.sin(Date.now() / 200) * 5; // Pulse
                }
                
                p.targetSize = p.baseSize + sizeFactor;
                p.currentSize += (p.targetSize - p.currentSize) * 0.1; // Smooth transition

                // SAFETY CHECK: Ensure finite values before drawing
                if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.currentSize)) {
                    // Reset invalid particle
                    p.x = canvas.width / 2;
                    p.y = canvas.height / 2;
                    p.currentSize = p.baseSize;
                    return;
                }

                // Draw Liquid Glass Orb
                ctx.beginPath();
                const radius = Math.max(0.1, p.currentSize); // Prevent 0 radius
                
                // Gradient for glass effect
                const gradient = ctx.createRadialGradient(
                    p.x - radius/3, p.y - radius/3, radius * 0.1, 
                    p.x, p.y, radius
                );
                
                if (status === 'speaking') {
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    gradient.addColorStop(0.4, 'rgba(129, 140, 248, 0.4)'); // Indigo
                    gradient.addColorStop(1, 'rgba(129, 140, 248, 0.1)');
                } else if (status === 'processing') {
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
                } else {
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                    gradient.addColorStop(0.4, 'rgba(56, 189, 248, 0.3)'); // Sky blue
                    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
                }

                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Glass Rim/Highlight
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.stroke();
            });
        };
        draw();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] transition-all duration-1000 ${status === 'speaking' ? 'scale-150 opacity-40' : 'scale-100 opacity-20'}`}></div>
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'listening' ? 'bg-green-500' : status === 'speaking' ? 'bg-indigo-500' : 'bg-white'}`}></div>
                    <span className="text-zinc-400 font-medium text-sm tracking-wider uppercase">Quillix Voice</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Main Visualizer */}
            <div className="absolute inset-0 flex items-center justify-center">
                <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full block" />
            </div>

            {/* Text Overlay */}
            <div className="absolute bottom-32 left-0 right-0 text-center max-w-2xl mx-auto px-6 z-20 pointer-events-none">
                {error ? (
                    <p className="text-red-400 text-lg">{error}</p>
                ) : (
                    <p className="text-3xl font-light text-white leading-relaxed transition-all duration-300 drop-shadow-lg">
                        {status === 'listening' ? (transcript || "Listening...") : 
                         status === 'processing' ? "Thinking..." : 
                         response}
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 flex items-center gap-6 z-20">
                <button onClick={() => setStatus(s => s === 'listening' ? 'processing' : 'listening')} className={`p-6 rounded-full transition-all duration-300 shadow-xl backdrop-blur-md border border-white/10 ${status === 'listening' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {status === 'listening' ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default GeminiLiveView;