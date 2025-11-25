import React, { useState, useEffect, useRef } from 'react';

interface VoiceInputViewProps {
    onClose: () => void;
    onFinalTranscript: (transcript: string) => void;
}

const VoiceInputView: React.FC<VoiceInputViewProps> = ({ onClose, onFinalTranscript }) => {
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    const stopAndSend = () => {
        if (transcript.trim()) {
            onFinalTranscript(transcript.trim());
        }
        onClose();
    };

    useEffect(() => {
        setError(null);
        // @ts-ignore
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition not supported.");
            setTimeout(onClose, 3000);
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            
            const currentTranscript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');

            setTranscript(currentTranscript);

            silenceTimerRef.current = setTimeout(() => {
                if (currentTranscript.trim()) {
                    onFinalTranscript(currentTranscript.trim());
                    onClose();
                }
            }, 3000);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setError("Microphone access denied.");
            } else {
                setError(`Error: ${event.error}`);
            }
            setTimeout(onClose, 3000);
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
                setError("Microphone access denied.");
                setTimeout(onClose, 3000);
            });

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const barWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArrayRef.current[i] * (height / 255);
            
            const gradient = ctx.createLinearGradient(0, height / 2, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
            
            x += barWidth;
        }
    };

    return (
        <div data-liquid-glass className="liquid-glass rounded-full flex items-center p-2 transition-all duration-300 shadow-2xl shadow-indigo-500/20 animate-pop-in">
            <canvas ref={canvasRef} className="w-16 h-8 ml-2" width="64" height="32"></canvas>
            <div className="flex-1 text-white px-3 text-left truncate">
                {error ? (
                    <span className="text-red-400">{error}</span>
                ) : transcript ? (
                    transcript
                ) : (
                    <span className="text-zinc-500">Listening...</span>
                )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors" title="Cancel">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <button onClick={stopAndSend} className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 shadow-lg transition-all duration-200 ml-1" title="Send">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    );
};

export default VoiceInputView;