import React, { useState, useEffect, useRef } from 'react';

// NOTE: This component uses the browser's built-in SpeechRecognition API.
// A full implementation of Gemini Live would require a backend service to stream
// audio to Google's API using the GEMINI_API_KEY. This component provides the
// requested UI and visualizer, and can be adapted to a real streaming API.

interface GeminiLiveViewProps {
    isActive: boolean;
    onClose: () => void;
    onFinalTranscript: (transcript: string) => void;
}

const GeminiLiveView: React.FC<GeminiLiveViewProps> = ({ isActive, onClose, onFinalTranscript }) => {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setIsListening(false);
        onClose();
    };

    const handleSend = () => {
        if (transcript.trim()) {
            onFinalTranscript(transcript.trim());
        }
        stopListening();
    };

    useEffect(() => {
        if (isActive) {
            setError(null);
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            if (!SpeechRecognition) {
                setError("Speech recognition is not supported in this browser.");
                return;
            }

            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event: any) => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setTranscript(finalTranscript + interimTranscript);
                silenceTimerRef.current = setTimeout(() => {
                    if ((finalTranscript + interimTranscript).trim()) {
                        handleSend();
                    }
                }, 3000);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (isActive) {
                    onClose();
                }
            };
            
            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setError("Microphone access was denied. Please enable it in your browser settings.");
                } else {
                    setError(`An error occurred: ${event.error}`);
                }
                setIsListening(false);
            };

            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    recognitionRef.current.start();
                    audioContextRef.current = new AudioContext();
                    analyserRef.current = audioContextRef.current.createAnalyser();
                    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.fftSize = 256;
                    const bufferLength = analyserRef.current.frequencyBinCount;
                    dataArrayRef.current = new Uint8Array(bufferLength);
                    draw();
                })
                .catch(err => {
                    console.error("Error accessing microphone:", err);
                    setError("Could not access microphone. Please grant permission and try again.");
                });

        } else {
            stopListening();
        }

        return () => {
            stopListening();
        };
    }, [isActive]);

    const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        
        const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        const scale = 1 + (average / 256) * 1.5;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) / 8;
        const radius = baseRadius * scale;

        const glowGradient = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, radius * 1.5);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);

        const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        orbGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        orbGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
        orbGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = orbGradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const highlightGradient = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.fill();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            return () => window.removeEventListener('resize', resizeCanvas);
        }
    }, []);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            
            <div className="absolute top-4 right-4 z-10">
                <button onClick={stopListening} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div className="relative w-full max-w-4xl text-center flex flex-col items-center z-10">
                {error ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Access Denied</h2>
                        <p className="text-zinc-400 max-w-md mx-auto">{error}</p>
                        <button onClick={stopListening} className="mt-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full font-medium transition-all">
                            Go Back
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-2xl md:text-4xl font-medium text-white min-h-[80px] drop-shadow-lg">
                            {transcript || <span className="text-zinc-500">Listening...</span>}
                        </p>
                        <div className="mt-12">
                            <button 
                                onClick={handleSend}
                                className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-2xl shadow-white/20 hover:bg-zinc-200 transition-all transform hover:scale-105"
                                title="Send Message"
                            >
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GeminiLiveView;