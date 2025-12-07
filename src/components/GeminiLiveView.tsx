import React, { useState, useEffect, useRef } from 'react';
import { chatWithGeminiLive } from '../services/geminiService';

interface GeminiLiveViewProps {
    onClose: () => void;
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
                analyserRef.current.fftSize = 256;
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
            setHistory(prev => [...prev, { role: 'Gemini', message: aiResponse }]);
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

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyserRef.current!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Circular visualizer logic
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 80;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
            ctx.fillStyle = status === 'processing' ? 'rgba(255,255,255,0.8)' : 
                           status === 'speaking' ? 'rgba(99, 102, 241, 0.8)' : 
                           'rgba(0,0,0,0.5)';
            ctx.fill();

            // Blobs/Bars around circle
            const bars = 40;
            const step = (Math.PI * 2) / bars;

            for (let i = 0; i < bars; i++) {
                // Use different frequency bands
                const value = dataArray[i * 2] || 0; 
                // Scale bar length based on volume and status
                const barLen = (value / 255) * 100 * (status === 'listening' ? 1.5 : 0.5);
                const angle = i * step;

                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + barLen);
                const y2 = centerY + Math.sin(angle) * (radius + barLen);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = status === 'listening' ? '#4ade80' : 
                                  status === 'processing' ? '#fff' : 
                                  '#818cf8';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            // Rotating ring for processing
            if (status === 'processing') {
                const time = Date.now() / 1000;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 40, time % (Math.PI*2), (time + 1.5) % (Math.PI*2));
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };
        draw();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] transition-all duration-1000 ${status === 'speaking' ? 'scale-150 opacity-40' : 'scale-100 opacity-20'}`}></div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] transition-all duration-1000 delay-100 ${status === 'processing' ? 'scale-125 opacity-50' : 'scale-100 opacity-20'}`}></div>
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-zinc-400 font-medium text-sm tracking-wider uppercase">Gemini Live</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Main Visualizer */}
            <div className="relative z-10 flex flex-col items-center gap-12">
                <div className="relative w-80 h-80 flex items-center justify-center">
                    <canvas ref={canvasRef} width="400" height="400" className="w-full h-full" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img src="/quillix-logo.png" className={`w-20 h-20 opacity-80 transition-transform duration-500 ${status === 'processing' ? 'scale-110' : 'scale-100'}`} />
                    </div>
                </div>

                <div className="text-center max-w-xl px-6 min-h-[100px]">
                    {error ? (
                        <p className="text-red-400">{error}</p>
                    ) : (
                        <p className="text-2xl font-light text-white leading-relaxed transition-all duration-300">
                            {status === 'listening' ? (transcript || "Listening...") : 
                             status === 'processing' ? "Thinking..." : 
                             response}
                        </p>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 flex items-center gap-6 z-10">
                <button onClick={() => setStatus(s => s === 'listening' ? 'processing' : 'listening')} className={`p-6 rounded-full transition-all duration-300 shadow-xl ${status === 'listening' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
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