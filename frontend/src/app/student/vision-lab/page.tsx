"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ChevronRight, CheckCircle, XCircle, Sparkles, Eye, Layers, Grid3X3, Brain } from "lucide-react";
import api from "@/lib/api";

// Types
interface MCQOption {
    text: string;
    is_correct: boolean;
}

interface ReflectionMCQ {
    question: string;
    options: MCQOption[];
    explanation: string;
}

interface StageData {
    stage_name: string;
    stage_description: string;
    image_base64: string;
    mcq: ReflectionMCQ;
}

interface FinalInterpretation {
    label: string;
    confidence_note: string;
    explanation: string;
}

interface ExploreResponse {
    stages: StageData[];
    final_explanation: string;
    final_interpretation?: FinalInterpretation;
}

// Glass Card Component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl ${className}`}>
        {children}
    </div>
);

// Stage Icons
const stageIcons = [Eye, Layers, Grid3X3, Brain];

export default function VisionLabPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<ExploreResponse | null>(null);
    const [currentStage, setCurrentStage] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File) => {
        setIsLoading(true);
        setResponse(null);
        setCurrentStage(0);
        setCompletedStages(new Set());

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/vision/explore", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setResponse(res.data);
        } catch (err) {
            console.error("Vision exploration failed:", err);
            alert("Failed to process image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const handleAnswerSelect = (index: number, isCorrect: boolean) => {
        setSelectedAnswer(index);
        setShowExplanation(true);
        if (isCorrect) {
            setCompletedStages(prev => new Set([...prev, currentStage]));
        }
    };

    const handleNextStage = () => {
        if (response && currentStage < response.stages.length - 1) {
            setCurrentStage(prev => prev + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
        } else if (response && currentStage === response.stages.length - 1) {
            // Show final explanation
            setCurrentStage(response.stages.length);
        }
    };

    const currentData = response?.stages[currentStage];
    const StageIcon = stageIcons[currentStage] || Brain;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Sparkles size={24} />
                        <span className="text-sm uppercase tracking-wider font-semibold">Visual Exploration Lab</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">
                        How Does a CNN <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">See</span>?
                    </h1>
                    <p className="text-white/60 max-w-lg mx-auto">
                        Upload an image and observe how a Convolutional Neural Network processes it layer by layer.
                    </p>
                </div>

                {/* Upload Area (show when no response) */}
                {!response && !isLoading && (
                    <GlassCard className="p-12">
                        <div
                            className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={48} className="mx-auto text-white/40 mb-4" />
                            <p className="text-white/80 font-medium">Drop an image here or click to upload</p>
                            <p className="text-white/40 text-sm mt-2">Supports PNG, JPG, WebP</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    </GlassCard>
                )}

                {/* Loading State */}
                {isLoading && (
                    <GlassCard className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500 border-t-transparent mx-auto mb-4" />
                        <p className="text-white/80">Processing your image through CNN layers...</p>
                    </GlassCard>
                )}

                {/* Exploration Flow */}
                {response && currentStage < response.stages.length && currentData && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStage}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                                {response.stages.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex-1 h-1 rounded-full transition-colors ${idx < currentStage
                                            ? "bg-green-500"
                                            : idx === currentStage
                                                ? "bg-purple-500"
                                                : "bg-white/10"
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Stage Header */}
                            <GlassCard className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <StageIcon size={24} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-400 uppercase tracking-wider">Stage {currentStage + 1} of {response.stages.length}</p>
                                        <h2 className="text-xl font-bold text-white">{currentData.stage_name}</h2>
                                    </div>
                                </div>
                                <p className="text-white/60">{currentData.stage_description}</p>
                            </GlassCard>

                            {/* Image Display */}
                            <GlassCard className="p-4 overflow-hidden">
                                <img
                                    src={`data:image/png;base64,${currentData.image_base64}`}
                                    alt={currentData.stage_name}
                                    className="w-full max-w-md mx-auto rounded-lg"
                                />
                            </GlassCard>

                            {/* MCQ Section */}
                            <GlassCard className="p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white">🤔 Reflection Question</h3>
                                <p className="text-white/80">{currentData.mcq.question}</p>

                                <div className="space-y-2">
                                    {currentData.mcq.options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => !showExplanation && handleAnswerSelect(idx, opt.is_correct)}
                                            disabled={showExplanation}
                                            className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${selectedAnswer === idx
                                                ? opt.is_correct
                                                    ? "bg-green-500/20 border-green-500 border"
                                                    : "bg-red-500/20 border-red-500 border"
                                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                                                } ${showExplanation ? "cursor-default" : "cursor-pointer"}`}
                                        >
                                            {selectedAnswer === idx && (
                                                opt.is_correct
                                                    ? <CheckCircle size={20} className="text-green-400" />
                                                    : <XCircle size={20} className="text-red-400" />
                                            )}
                                            <span className={selectedAnswer === idx ? (opt.is_correct ? "text-green-300" : "text-red-300") : "text-white/80"}>
                                                {opt.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Explanation */}
                                {showExplanation && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mt-4"
                                    >
                                        <p className="text-purple-300 font-medium mb-2">💡 Explanation</p>
                                        <p className="text-white/80 text-sm">{currentData.mcq.explanation}</p>
                                    </motion.div>
                                )}

                                {/* Next Button */}
                                {showExplanation && (
                                    <button
                                        onClick={handleNextStage}
                                        className="w-full mt-4 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                    >
                                        {currentStage < response.stages.length - 1 ? "Next Layer" : "See Summary"}
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                            </GlassCard>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Final Summary */}
                {response && currentStage >= response.stages.length && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <GlassCard className="p-8 text-center space-y-6">
                            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle size={32} className="text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Exploration Complete!</h2>
                            <div className="prose prose-invert max-w-none text-left">
                                <div
                                    className="text-white/80 text-sm whitespace-pre-line"
                                    dangerouslySetInnerHTML={{ __html: response.final_explanation.replace(/##/g, '<h3 class="text-lg font-semibold text-purple-300 mt-4">').replace(/\*\*/g, '<strong>').replace(/\n/g, '<br/>') }}
                                />
                            </div>

                            {/* Model Interpretation Summary */}
                            {response.final_interpretation && (
                                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6 text-left mt-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Brain size={20} className="text-cyan-400" />
                                        <h3 className="text-lg font-semibold text-cyan-300">Model Interpretation Summary</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white/90">
                                            <span className="text-cyan-400 font-medium">Interprets as:</span>{" "}
                                            <span className="capitalize">{response.final_interpretation.label}</span>
                                        </p>
                                        <p className="text-white/60 text-sm italic">
                                            ({response.final_interpretation.confidence_note})
                                        </p>
                                        <p className="text-white/80 text-sm mt-2">
                                            {response.final_interpretation.explanation}
                                        </p>
                                    </div>
                                    <p className="text-white/40 text-xs mt-4 italic">
                                        ⚠️ This is the model's best guess based on extracted features, not ground truth.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setResponse(null);
                                    setCurrentStage(0);
                                    setSelectedAnswer(null);
                                    setShowExplanation(false);
                                    setCompletedStages(new Set());
                                }}
                                className="py-3 px-8 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                            >
                                Try Another Image
                            </button>
                        </GlassCard>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
