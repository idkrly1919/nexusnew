import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quiz, QuizQuestion, UserAnswer } from '../types';
import { generateQuiz, evaluateAnswer, getExplanation, getImprovementTips } from '../services/geminiService';
import DynamicBackground from '../components/DynamicBackground';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';
import FileDropzone from '../components/FileDropzone';

const ScoreCircle = ({ score }: { score: number }) => {
    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(circumference - (score / 100) * circumference);
        }, 100);
        return () => clearTimeout(timer);
    }, [score, circumference]);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                <circle className="text-white/10" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                <circle
                    className="text-indigo-500"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" fill="transparent" r={radius} cx={size / 2} cy={size / 2}
                    transform={`rotate(-90 ${size/2} ${size/2})`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{Math.round(score)}%</span>
            </div>
        </div>
    );
};

const QuizExplanationSidebar = ({ isOpen, onClose, question, userAnswer, explanation }: { isOpen: boolean, onClose: () => void, question: QuizQuestion, userAnswer: string, explanation: string | null }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-black/50 backdrop-blur-lg border-l border-white/10 animate-pop-in">
            <div className="flex flex-col h-full">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Explanation</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-6">
                    <div><p className="text-sm font-medium text-zinc-400 mb-1">Question:</p><p className="text-white">{question.question.replace('___', `[${question.correct_answer}]`)}</p></div>
                    <div><p className="text-sm font-medium text-zinc-400 mb-1">Your Answer:</p><p className="text-red-400">{userAnswer}</p></div>
                    <div>
                        <p className="text-sm font-medium text-zinc-400 mb-1">Explanation:</p>
                        {explanation ? <p className="text-zinc-200 whitespace-pre-wrap">{explanation}</p> : <div className="flex items-center gap-2 text-zinc-400"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating explanation...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuizPage: React.FC = () => {
    const { session } = useSession();
    const [quizState, setQuizState] = useState<'topic' | 'count' | 'generating' | 'active' | 'finished'>('topic');
    const [topic, setTopic] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [numQuestions, setNumQuestions] = useState(10);
    const [quizData, setQuizData] = useState<Quiz | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState<{ correct: boolean, score: number, correct_answer: string } | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [improvementTips, setImprovementTips] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
                e.preventDefault();
                const files = Array.from(e.clipboardData.files);
                setAttachedFiles(prev => [...prev, ...files].slice(0, 10));
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    const handleTopicSubmit = (e: FormEvent) => { e.preventDefault(); if (topic.trim()) setQuizState('count'); };
    const handleCountSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setQuizState('generating');
        try {
            let fileContext = '';
            for (const file of attachedFiles) {
                const content = await file.text();
                fileContext += `\n\n--- File: ${file.name} ---\n${content}`;
            }
            const data = await generateQuiz(topic, numQuestions, fileContext);
            setQuizData(data);
            setQuizState('active');
        } catch (error) {
            console.error("Error generating quiz:", error);
            alert("Failed to generate quiz. Please try again.");
            setQuizState('topic');
        }
    };

    const handleAnswerSubmit = async () => {
        if (!quizData) return;
        const currentQuestion = quizData.questions[currentQuestionIndex];
        let result = { correct: false, score: 0, correct_answer: currentQuestion.correct_answer };
        if (currentQuestion.type === 'multiple-choice') {
            result.correct = selectedAnswer === currentQuestion.correct_answer;
            result.score = result.correct ? 10 : 0;
        } else {
            setIsEvaluating(true);
            try {
                const evaluation = await evaluateAnswer(currentQuestion, selectedAnswer);
                result.correct = evaluation.is_correct;
                result.score = evaluation.score;
            } catch (error) { console.error("Error evaluating answer:", error); } 
            finally { setIsEvaluating(false); }
        }
        setFeedback(result);
        setUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: selectedAnswer, isCorrect: result.correct, score: result.score }]);
        setIsAnswered(true);
    };

    const handleNextQuestion = () => {
        setIsAnswered(false); setSelectedAnswer(''); setFeedback(null); if (isSidebarOpen) setIsSidebarOpen(false);
        if (currentQuestionIndex < quizData!.questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); } 
        else { setQuizState('finished'); }
    };

    const handleOpenExplanation = async () => {
        if (!quizData || !feedback) return;
        setExplanation(null); setIsSidebarOpen(true);
        const explanationText = await getExplanation(quizData.questions[currentQuestionIndex], selectedAnswer, feedback.correct_answer);
        setExplanation(explanationText);
    };
    
    const handleGetImprovementTips = async () => {
        if (!quizData) return;
        setImprovementTips("Generating tips...");
        const tips = await getImprovementTips(quizData.topic, userAnswers, quizData);
        setImprovementTips(tips);
    };

    const calculateScore = () => {
        if (!quizData) return 0;
        const totalPossibleScore = quizData.questions.length * 10;
        const userTotalScore = userAnswers.reduce((sum, ans) => sum + ans.score, 0);
        return (userTotalScore / totalPossibleScore) * 100;
    };

    const handleSaveToHistory = async () => {
        if (!quizData || !session) return;
        setIsSaving(true);
        const score = calculateScore();
        let summary = `### Quiz Results: ${quizData.topic}\n\n**Final Score: ${Math.round(score)}%**\n\n---\n\n`;
        quizData.questions.forEach((q, i) => {
            const userAnswer = userAnswers.find(a => a.questionIndex === i);
            summary += `**${i + 1}. ${q.question.replace('___', `[${q.correct_answer}]`)}**\n*Your Answer:* ${userAnswer?.answer} ${userAnswer?.isCorrect ? '✅' : '❌'}\n\n`;
        });
        try {
            const { data: newConversation, error: createError } = await supabase.from('conversations').insert({ user_id: session.user.id, title: `Quiz: ${quizData.topic}` }).select().single();
            if (createError) throw createError;
            const messagesToInsert = [
                { conversation_id: newConversation.id, user_id: session.user.id, role: 'user', content: `I took a quiz on "${quizData.topic}".` },
                { conversation_id: newConversation.id, user_id: session.user.id, role: 'assistant', content: summary }
            ];
            const { error: messageError } = await supabase.from('messages').insert(messagesToInsert);
            if (messageError) throw messageError;
            navigate(`/chat/${newConversation.id}`);
        } catch (error) {
            console.error("Error saving quiz to history:", error);
            alert("Could not save quiz to history.");
        } finally { setIsSaving(false); }
    };

    const renderContent = () => {
        switch (quizState) {
            case 'topic': return (
                <div className="w-full max-w-2xl text-center animate-pop-in">
                    <h1 className="text-4xl font-bold mb-4">Quiz Mode</h1>
                    <p className="text-zinc-400 mb-8">What topic would you like to be quizzed on? You can also provide files for context.</p>
                    <form onSubmit={handleTopicSubmit} className="space-y-6">
                        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., 'The Roman Empire'" required className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30" />
                        <FileDropzone attachedFiles={attachedFiles} setAttachedFiles={setAttachedFiles} />
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-[0_0_20px_rgba(129,140,248,0.4)] hover:shadow-[0_0_30px_rgba(129,140,248,0.6)] interactive-lift">Continue</button>
                    </form>
                </div>
            );
            case 'count': return (
                <div className="w-full max-w-lg text-center animate-pop-in">
                    <h1 className="text-4xl font-bold mb-4">Number of Questions</h1>
                    <p className="text-zinc-400 mb-8">How many questions should be in your quiz?</p>
                    <form onSubmit={handleCountSubmit} className="space-y-6">
                        <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} min="1" max="50" className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30" />
                        <div className="flex gap-4 justify-center">
                            <button type="button" onClick={() => setQuizState('topic')} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium">Back</button>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-medium interactive-lift">Generate Quiz</button>
                        </div>
                    </form>
                </div>
            );
            case 'generating': return (
                <div className="text-center animate-pop-in space-y-4">
                    <svg className="animate-spin h-12 w-12 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <h2 className="text-2xl font-bold">Crafting your quiz...</h2>
                    <p className="text-zinc-400">Topic: {topic}</p>
                </div>
            );
            case 'active':
                if (!quizData) return null;
                const question = quizData.questions[currentQuestionIndex];
                return (
                    <div className="w-full max-w-3xl animate-pop-in">
                        <div className="text-center mb-8"><p className="text-indigo-400 font-semibold">{quizData.topic}</p><h2 className="text-2xl font-bold">Question {currentQuestionIndex + 1} of {quizData.questions.length}</h2></div>
                        <div data-liquid-glass className="liquid-glass p-8 rounded-2xl">
                            <p className="text-xl mb-6 text-center">{question.question.replace('___', '_____')}</p>
                            {question.type === 'multiple-choice' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{question.options?.map(option => <button key={option} disabled={isAnswered} onClick={() => setSelectedAnswer(option)} className={`p-4 rounded-xl border text-left transition-all duration-300 disabled:cursor-not-allowed ${selectedAnswer === option ? 'bg-indigo-500/30 border-indigo-500/60' : 'bg-white/5 border-white/10 hover:bg-white/10'} ${isAnswered && option === feedback?.correct_answer ? '!bg-green-500/30 !border-green-500/60' : ''} ${isAnswered && selectedAnswer === option && !feedback?.correct ? '!bg-red-500/30 !border-red-500/60' : ''}`}>{option}</button>)}</div>}
                            {(question.type === 'short-answer' || question.type === 'fill-in-the-blank') && <textarea value={selectedAnswer} onChange={(e) => setSelectedAnswer(e.target.value)} disabled={isAnswered} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30" placeholder="Your answer..." />}
                            <div className="mt-6 text-center">
                                {isAnswered ? <div className="space-y-4">{feedback?.correct ? <p className="text-green-400 font-bold text-lg">Correct! (+{feedback.score} points)</p> : <div><p className="text-red-400 font-bold text-lg">Incorrect (+{feedback?.score} points)</p>{question.type !== 'multiple-choice' && <p className="text-zinc-400 text-sm">Ideal Answer: {feedback?.correct_answer}</p>}<button onClick={handleOpenExplanation} className="mt-2 text-sm text-indigo-400 hover:underline">Why did I get it wrong?</button></div>}<button onClick={handleNextQuestion} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-medium">{currentQuestionIndex === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</button></div> : <button onClick={handleAnswerSubmit} disabled={!selectedAnswer.trim() || isEvaluating} className="bg-white hover:bg-zinc-200 text-black px-8 py-3 rounded-full font-medium disabled:bg-zinc-700 disabled:text-zinc-400">{isEvaluating ? 'Evaluating...' : 'Submit Answer'}</button>}
                            </div>
                        </div>
                    </div>
                );
            case 'finished':
                const finalScore = calculateScore();
                return (
                    <div className="w-full max-w-3xl text-center animate-pop-in">
                        <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1><p className="text-zinc-400 mb-8">You finished the quiz on {quizData?.topic}.</p>
                        <div className="flex justify-center mb-8"><ScoreCircle score={finalScore} /></div>
                        <div className="flex justify-center gap-4 mb-8"><button onClick={handleGetImprovementTips} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-medium">How can I improve?</button><button onClick={handleSaveToHistory} disabled={isSaving} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full font-medium">{isSaving ? 'Saving...' : 'Save to History'}</button></div>
                        {improvementTips && <div data-liquid-glass className="liquid-glass p-6 rounded-2xl text-left mb-8 whitespace-pre-wrap">{improvementTips}</div>}
                        <div className="space-y-4 text-left"><h3 className="text-xl font-bold">Review Your Answers</h3>{quizData?.questions.map((q, i) => { const userAnswer = userAnswers.find(a => a.questionIndex === i); return (<div key={i} data-liquid-glass className={`liquid-glass p-4 rounded-xl border ${userAnswer?.isCorrect ? 'border-green-500/30' : 'border-red-500/30'}`}><p className="font-semibold">{i + 1}. {q.question.replace('___', `[${q.correct_answer}]`)}</p><p className={`text-sm ${userAnswer?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>Your answer: {userAnswer?.answer}</p>{!userAnswer?.isCorrect && q.type !== 'multiple-choice' && <p className="text-xs text-zinc-400 mt-1">Correct answer: {q.correct_answer}</p>}</div>); })}</div>
                        <button onClick={() => { setQuizState('topic'); setTopic(''); setAttachedFiles([]); setQuizData(null); setUserAnswers([]); setCurrentQuestionIndex(0); setImprovementTips(null); }} className="mt-8 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium">Take another quiz</button>
                    </div>
                );
        }
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-10 flex flex-col items-center justify-center p-4 text-white overflow-y-auto scrollbar-hide">
                <button onClick={() => navigate('/chat')} className="absolute top-6 left-6 p-2 rounded-full text-zinc-300 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                {renderContent()}
            </div>
            {quizData && feedback && <QuizExplanationSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} question={quizData.questions[currentQuestionIndex]} userAnswer={selectedAnswer} explanation={explanation} />}
        </>
    );
};

export default QuizPage;