import React, { useState, useEffect, useRef } from 'react';
import { chatWithGeminiLive } from '../services/geminiService';

interface GeminiLiveViewProps {
    onClose: () => void;
}

interface Orb {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    radius: number;
    targetRadius: number;
    color: string;
    angle: number;
    speed: number;
    offset: number;
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
    const orbsRef = useRef<Orb[]>([]);

    // Colors mimicking the Gemini/Google DeepMind aesthetic
    const colors = [
        'rgba(66, 133, 244, 0.8)', // Blue
        'rgba(219, 68, 55, 0.8)',  // Red
        'rgba(244, 180, 0, 0.8)',  // Yellow
        'rgba(15, 157, 88, 0.8)',  // Green
        'rgba(171, 71, 188, 0.8)'  // Purple
    ];

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

            // 1.2s silence triggers send
            silenceTimerRef.current = setTimeout(() => {
                if (currentTranscript.trim()) {
                    handleUserTurn(currentTranscript.trim());
                }
            }, 1200);
        };

        recognitionRef.current.onerror = (event: any) => {
            if (event.error === 'not-allowed') setError("Microphone blocked.");
        };

        startListening();

        return () => {
            stopListening();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    // Initialize Audio Context for Visualizer
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.fftSize = 256; 
                analyserRef.current.smoothingTimeConstant = 0.8;
                drawVisualizer();
            })
            .catch(err => console.error("Mic error:", err));

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
        } catch (e) {}
    };

    const stopListening = () => {
        try {
            recognitionRef.current?.stop();
        } catch (e) {}
    };

    const handleUserTurn = async (text: string) => {
        stopListening();
        setStatus('processing');
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

        // Initialize Orbs
        if (orbsRef.current.length === 0) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            for (let i = 0; i < 5; i++) {
                orbsRef.current.push({
                    x: centerX,
                    y: centerY,
                    targetX: centerX,
                    targetY: centerY,
                    vx: 0,
                    vy: 0,
                    radius: 50,
                    targetRadius: 50,
                    color: colors[i],
                    angle: (i / 5) * Math.PI * 2,
                    speed: 0.02 + Math.random() * 0.02,
                    offset: Math.random() * 100
                });
            }
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate Volume
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avgVolume = sum / bufferLength;
            
            const time = Date.now() * 0.001;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Global Blend Mode for "Liquid" effect
            ctx.globalCompositeOperation = 'screen'; 

            orbsRef.current.forEach((orb, i) => {
                // Determine State Behavior
                let movementRadius = 50;
                let volumeInfluence = 0;

                if (status === 'listening') {
                    // Spread out slightly, react to user volume
                    movementRadius = 50 + avgVolume * 0.5;
                    volumeInfluence = (avgVolume / 255) * 100;
                } else if (status === 'speaking') {
                    // Artificial "AI Speaking" waveform simulation
                    const wave = Math.sin(time * 10 + i) * Math.cos(time * 5);
                    volumeInfluence = Math.abs(wave) * 80 + 20; 
                    movementRadius = 80;
                } else {
                    // Processing / Thinking (Spinning)
                    movementRadius = 30;
                    volumeInfluence = Math.sin(time * 5 + i) * 10;
                    orb.angle += 0.05; // Spin faster
                }

                // Calculate Target Position (Orbiting center)
                // If speaking or listening, more chaotic. If processing, tighter spin.
                orb.angle += orb.speed;
                
                orb.targetX = centerX + Math.cos(orb.angle) * movementRadius;
                orb.targetY = centerY + Math.sin(orb.angle) * movementRadius;

                // Physics Easing
                orb.x += (orb.targetX - orb.x) * 0.1;
                orb.y += (orb.targetY - orb.y) * 0.1;

                // Size Reactivity
                orb.targetRadius = 40 + volumeInfluence;
                orb.radius += (orb.targetRadius - orb.radius) * 0.2;

                // Ensure finite
                if (!Number.isFinite(orb.x)) orb.x = centerX;
                if (!Number.isFinite(orb.y)) orb.y = centerY;
                if (!Number.isFinite(orb.radius) || orb.radius < 0) orb.radius = 1;

                // Draw Gradient Orb
                const gradient = ctx.createRadialGradient(
                    orb.x, orb.y, 0,
                    orb.x, orb.y, orb.radius
                );
                
                gradient.addColorStop(0, orb.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Reset blend mode for text
            ctx.globalCompositeOperation = 'source-over';
        };
        draw();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'listening' ? 'bg-emerald-400' : status === 'speaking' ? 'bg-blue-400' : 'bg-white'}`}></div>
                    <span className="text-zinc-200 font-medium text-sm tracking-wide">Quillix Voice</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors group">
                    <svg className="group-hover:rotate-90 transition-transform duration-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Visualizer Canvas */}
            <div className="absolute inset-0 flex items-center justify-center">
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