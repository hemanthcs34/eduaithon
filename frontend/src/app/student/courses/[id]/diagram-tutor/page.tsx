"use client";

import React, { useState, useCallback } from 'react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui/glass';
import { Upload, Brain, CheckCircle, AlertTriangle, Loader2, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DetectedLayer {
    name: string;
    order: number;
    valid: boolean;
    issue: string | null;
}

interface CorrectionStep {
    step: number;
    action: string;
    where: string;
    why: string;
    how: string;
}

interface DiagramSubmission {
    id: number;
    course_id: number;
    image_path: string;
    extracted_structure: {
        layers: DetectedLayer[];
        flow_valid: boolean;
        suggestions: string[];
        correction_steps: CorrectionStep[];
    } | null;
    ai_feedback: string | null;
    correctness_score: number | null;
    created_at: string;
}

export default function DiagramTutorPage() {
    const { id } = useParams();
    const courseId = Number(id);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<DiagramSubmission | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submissions, setSubmissions] = useState<DiagramSubmission[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Fetch previous submissions
    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get(`/diagram/course/${courseId}/submissions`);
            setSubmissions(res.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, [courseId]);

    React.useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setResult(null);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', courseId.toString());

        try {
            const res = await api.post('/diagram/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000 // 2 min timeout for vision analysis
            });
            setResult(res.data);
            fetchHistory(); // Refresh history
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } }; message?: string };
            setError(error.response?.data?.detail || error.message || 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-white/50';
        if (score >= 0.8) return 'text-green-400';
        if (score >= 0.5) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreLabel = (score: number | null) => {
        if (score === null) return 'N/A';
        if (score >= 0.8) return 'Excellent';
        if (score >= 0.6) return 'Good';
        if (score >= 0.4) return 'Needs Work';
        return 'Review Required';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/student/courses/${courseId}`}>
                        <GlassButton className="!p-2">
                            <ArrowLeft size={20} />
                        </GlassButton>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Brain className="text-primary" />
                            Diagram Intelligence Tutor
                        </h1>
                        <p className="text-white/60 text-sm">Module 4 - CNN Architecture Analysis</p>
                    </div>
                </div>
                <GlassButton
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2"
                >
                    <Sparkles size={16} />
                    {showHistory ? 'New Submission' : `History (${submissions.length})`}
                </GlassButton>
            </div>

            {showHistory ? (
                /* History View */
                <div className="grid gap-4">
                    <h2 className="text-lg font-bold text-white">Previous Submissions</h2>
                    {submissions.length === 0 ? (
                        <GlassCard className="p-8 text-center">
                            <p className="text-white/50">No submissions yet. Upload your first CNN diagram!</p>
                        </GlassCard>
                    ) : (
                        submissions.map((sub) => (
                            <GlassCard key={sub.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                                        <ImageIcon className="text-white/20" size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white/60 text-xs">
                                                {new Date(sub.created_at).toLocaleString()}
                                            </span>
                                            <span className={cn("font-bold", getScoreColor(sub.correctness_score))}>
                                                {sub.correctness_score !== null
                                                    ? `${Math.round(sub.correctness_score * 100)}%`
                                                    : 'Error'}
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-sm line-clamp-2">
                                            {sub.ai_feedback || 'No feedback available'}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))
                    )}
                </div>
            ) : (
                /* Upload & Analysis View */
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <GlassCard className="p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Upload className="text-primary" size={20} />
                            Upload CNN Diagram
                        </h2>

                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                                preview ? "border-primary/50 bg-primary/5" : "border-white/20 hover:border-white/40"
                            )}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {preview ? (
                                <div className="space-y-4">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="max-h-64 mx-auto rounded-lg"
                                    />
                                    <p className="text-white/60 text-sm">{file?.name}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                                        <Upload className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Drop your CNN diagram here</p>
                                        <p className="text-white/50 text-sm">or click to browse (PNG, JPG)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <GlassButton
                            onClick={handleSubmit}
                            disabled={!file || isAnalyzing}
                            className="w-full mt-4 flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Analyzing with AI Vision...
                                </>
                            ) : (
                                <>
                                    <Brain size={16} />
                                    Analyze Diagram
                                </>
                            )}
                        </GlassButton>

                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </GlassCard>

                    {/* Results Section */}
                    <GlassCard className="p-6 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 sticky top-0 bg-black/50 backdrop-blur-sm py-2 -mt-2 -mx-2 px-2">
                            <Sparkles className="text-accent" size={20} />
                            AI Analysis Results
                        </h2>

                        {result ? (
                            <div className="space-y-4">
                                {/* Score */}
                                <div className="text-center p-4 rounded-xl bg-white/5">
                                    <div className={cn("text-4xl font-bold", getScoreColor(result.correctness_score))}>
                                        {result.correctness_score !== null
                                            ? `${Math.round(result.correctness_score * 100)}%`
                                            : 'Error'}
                                    </div>
                                    <p className={cn("text-sm", getScoreColor(result.correctness_score))}>
                                        {getScoreLabel(result.correctness_score)}
                                    </p>
                                </div>

                                {/* Detected Layers */}
                                {result.extracted_structure?.layers && result.extracted_structure.layers.length > 0 && (
                                    <div>
                                        <h3 className="text-white/80 font-medium mb-2">Detected Layers</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {result.extracted_structure.layers.map((layer, idx) => (
                                                <span
                                                    key={idx}
                                                    className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-medium",
                                                        layer.valid
                                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                                                    )}
                                                >
                                                    {layer.valid ? <CheckCircle className="inline mr-1" size={12} /> : <AlertTriangle className="inline mr-1" size={12} />}
                                                    {layer.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Flow Validation */}
                                {result.extracted_structure && (
                                    <div className={cn(
                                        "p-3 rounded-lg",
                                        result.extracted_structure.flow_valid
                                            ? "bg-green-500/10 border border-green-500/30"
                                            : "bg-yellow-500/10 border border-yellow-500/30"
                                    )}>
                                        <p className={result.extracted_structure.flow_valid ? "text-green-400" : "text-yellow-400"}>
                                            {result.extracted_structure.flow_valid
                                                ? "✓ Layer flow is valid"
                                                : "⚠ Layer flow has issues"}
                                        </p>
                                    </div>
                                )}

                                {/* AI Feedback */}
                                <div>
                                    <h3 className="text-white/80 font-medium mb-2">Feedback</h3>
                                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.ai_feedback || 'No feedback available.'}
                                    </p>
                                </div>

                                {/* Suggestions */}
                                {result.extracted_structure?.suggestions && result.extracted_structure.suggestions.length > 0 && (
                                    <div>
                                        <h3 className="text-white/80 font-medium mb-2">Suggestions</h3>
                                        <ul className="space-y-2">
                                            {result.extracted_structure.suggestions.map((suggestion, idx) => (
                                                <li key={idx} className="text-white/60 text-sm flex items-start gap-2">
                                                    <span className="text-accent">→</span>
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Step-by-Step Correction Guide */}
                                {result.extracted_structure?.correction_steps && result.extracted_structure.correction_steps.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-white/10">
                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <span className="text-2xl">🔧</span>
                                            How to Fix Your Diagram
                                        </h3>
                                        <div className="space-y-4">
                                            {result.extracted_structure.correction_steps.map((step, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                                                            {step.step}
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <h4 className="text-white font-semibold">{step.action}</h4>

                                                            <div className="grid gap-2 text-sm">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-yellow-400 font-medium min-w-[60px]">Where:</span>
                                                                    <span className="text-white/70">{step.where}</span>
                                                                </div>

                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-green-400 font-medium min-w-[60px]">Why:</span>
                                                                    <span className="text-white/70">{step.why}</span>
                                                                </div>

                                                                <div className="flex items-start gap-2 bg-white/5 rounded-lg p-2 mt-1">
                                                                    <span className="text-purple-400 font-medium min-w-[60px]">How:</span>
                                                                    <span className="text-white/80">{step.how}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-white/40">
                                <Brain size={48} className="mb-4 opacity-20" />
                                <p>Upload a diagram to see AI analysis</p>
                                <p className="text-sm mt-1">Supports CNN architecture diagrams</p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            )}

            {/* Educational Info */}
            <GlassCard className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-none">
                <h3 className="text-white font-bold mb-2">📚 What makes a good CNN diagram?</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-white/70">
                    <div>
                        <span className="text-primary font-medium">Layer Order:</span>
                        <p>Conv → ReLU → Pool → ... → Flatten → FC → Softmax</p>
                    </div>
                    <div>
                        <span className="text-primary font-medium">Clear Labels:</span>
                        <p>Each layer should be clearly labeled with its type and parameters</p>
                    </div>
                    <div>
                        <span className="text-primary font-medium">Flow Direction:</span>
                        <p>Input on left/top, output on right/bottom with clear arrows</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
