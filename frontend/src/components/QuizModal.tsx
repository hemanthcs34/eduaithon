"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassButton } from '@/components/ui/glass';
import { Trophy, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface Question {
    question: string;
    options: string[];
    correct_answer: string;
    explanation?: string;
}

interface QuizProps {
    courseId: number;
    checkpoint: number;
    onComplete: (passed: boolean) => void;
    onClose: () => void;
}

export default function QuizModal({ courseId, checkpoint, onComplete, onClose }: QuizProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [quizId, setQuizId] = useState<number | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadQuiz();
    }, []);

    const loadQuiz = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.post(`/quiz/course/${courseId}/generate?trigger_video_index=${checkpoint}`, {}, { timeout: 600000 });
            setQuizId(res.data.quiz_id);
            setQuestions(res.data.questions);
            setAnswers(new Array(res.data.questions.length).fill(''));
        } catch (err: any) {
            console.error('Error loading quiz:', err);
            setError(err.response?.data?.detail || 'Failed to generate quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionIndex: number, answer: string) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = answer;
        setAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        if (answers.some(a => !a)) {
            alert('Please answer all questions');
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post('/quiz/submit', {
                quiz_id: quizId,
                answers: answers
            });
            setResult(res.data);
            if (res.data.passed) {
                setTimeout(() => onComplete(true), 2000);
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert('Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const getOptionLetter = (index: number) => String.fromCharCode(65 + index); // A, B, C, D

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-2xl p-8 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Generating Quiz...</h2>
                    <p className="text-white/60">Creating questions based on course materials</p>
                </GlassCard>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                    <p className="text-white/60 mb-4">{error}</p>
                    <div className="flex gap-4 justify-center">
                        <GlassButton onClick={loadQuiz}>Try Again</GlassButton>
                        <GlassButton className="bg-white/10 hover:bg-white/20 bg-none" onClick={onClose}>Close</GlassButton>
                    </div>
                </GlassCard>
            </div>
        );
    }

    if (result) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-2xl p-8">
                    <div className="text-center mb-6">
                        {result.passed ? (
                            <>
                                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Quiz Passed!</h2>
                                <p className="text-green-400 text-lg">Score: {result.score.toFixed(0)}%</p>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Keep Trying!</h2>
                                <p className="text-red-400 text-lg">Score: {result.score.toFixed(0)}% (Need 70% to pass)</p>
                            </>
                        )}
                        <p className="text-white/60 mt-2">
                            {result.correct_count} / {result.total_count} correct
                        </p>
                    </div>

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-6">
                        {result.feedback.map((fb: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded-lg border ${fb.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                <p className="text-white font-medium mb-2">{questions[idx].question}</p>
                                <p className="text-sm">
                                    <span className={fb.correct ? 'text-green-400' : 'text-red-400'}>
                                        Your answer: {fb.user_answer}
                                    </span>
                                    {!fb.correct && (
                                        <span className="text-green-400 ml-4">Correct: {fb.correct_answer}</span>
                                    )}
                                </p>
                                {fb.explanation && (
                                    <p className="text-white/50 text-sm mt-2">{fb.explanation}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 justify-center">
                        {result.passed ? (
                            <GlassButton onClick={() => onComplete(true)}>Continue Learning</GlassButton>
                        ) : (
                            <>
                                <GlassButton onClick={() => { setResult(null); setAnswers(new Array(questions.length).fill('')); }}>
                                    Try Again
                                </GlassButton>
                                <GlassButton className="bg-white/10 hover:bg-white/20 bg-none" onClick={onClose}>Review Videos</GlassButton>
                            </>
                        )}
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Quiz Time!</h2>
                        <p className="text-white/60 text-sm">Complete this quiz to continue (70% to pass)</p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-white/5 rounded-xl p-4">
                            <p className="text-white font-medium mb-4">
                                <span className="text-primary mr-2">Q{qIdx + 1}.</span>
                                {q.question}
                            </p>
                            <div className="space-y-2">
                                {q.options.map((option, oIdx) => {
                                    const letter = getOptionLetter(oIdx);
                                    const isSelected = answers[qIdx] === letter;
                                    return (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleAnswerSelect(qIdx, letter)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected
                                                ? 'border-primary bg-primary/20 text-white'
                                                : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
                                                }`}
                                        >
                                            <span className="font-bold mr-3">{letter}.</span>
                                            {option.replace(/^[A-D]\.\s*/, '')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-white/10 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <p className="text-white/60">
                            {answers.filter(a => a).length} / {questions.length} answered
                        </p>
                        <GlassButton
                            onClick={handleSubmit}
                            disabled={submitting || answers.some(a => !a)}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Quiz'
                            )}
                        </GlassButton>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
