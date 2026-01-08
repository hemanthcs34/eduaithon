"use client";

import React, { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui/glass';
import { Brain, CheckCircle, AlertTriangle, ArrowLeft, User, Calendar, ChevronDown, ChevronUp, Eye } from 'lucide-react';
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
    user_id: number;
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

export default function TeacherDiagramSubmissionsPage() {
    const { id } = useParams();
    const courseId = Number(id);

    const [submissions, setSubmissions] = useState<DiagramSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<DiagramSubmission | null>(null);
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

    // Fetch image with auth token
    const fetchImage = useCallback(async (submissionId: number) => {
        if (imageUrls[submissionId]) return; // Already fetched

        try {
            const response = await api.get(`/diagram/submission/${submissionId}/image`, {
                responseType: 'blob'
            });
            const url = URL.createObjectURL(response.data);
            setImageUrls(prev => ({ ...prev, [submissionId]: url }));
        } catch (err) {
            console.error('Failed to fetch image:', err);
        }
    }, [imageUrls]);

    const fetchSubmissions = useCallback(async () => {
        try {
            const res = await api.get(`/diagram/course/${courseId}/submissions`);
            setSubmissions(res.data);
        } catch (err) {
            console.error('Failed to fetch submissions:', err);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    // Fetch image when expanded or selected
    useEffect(() => {
        if (expandedId) {
            fetchImage(expandedId);
        }
    }, [expandedId, fetchImage]);

    useEffect(() => {
        if (selectedSubmission) {
            fetchImage(selectedSubmission.id);
        }
    }, [selectedSubmission, fetchImage]);

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-white/50';
        if (score >= 0.8) return 'text-green-400';
        if (score >= 0.5) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number | null) => {
        if (score === null) return 'bg-white/10';
        if (score >= 0.8) return 'bg-green-500/20';
        if (score >= 0.5) return 'bg-yellow-500/20';
        return 'bg-red-500/20';
    };

    const getScoreLabel = (score: number | null) => {
        if (score === null) return 'Error';
        if (score >= 0.8) return 'Excellent';
        if (score >= 0.6) return 'Good';
        if (score >= 0.4) return 'Needs Work';
        return 'Review Required';
    };

    // Calculate statistics
    const stats = {
        total: submissions.length,
        excellent: submissions.filter(s => s.correctness_score !== null && s.correctness_score >= 0.8).length,
        good: submissions.filter(s => s.correctness_score !== null && s.correctness_score >= 0.5 && s.correctness_score < 0.8).length,
        needsWork: submissions.filter(s => s.correctness_score !== null && s.correctness_score < 0.5).length,
        avgScore: submissions.length > 0
            ? submissions.reduce((acc, s) => acc + (s.correctness_score || 0), 0) / submissions.length
            : 0
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-primary">
                    <Brain size={48} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/teacher/courses/${courseId}`}>
                        <GlassButton className="!p-2">
                            <ArrowLeft size={20} />
                        </GlassButton>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Brain className="text-purple-400" />
                            Student Diagram Submissions
                        </h1>
                        <p className="text-white/60 text-sm">Review CNN architecture submissions from your students</p>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                    <p className="text-white/60 text-sm">Total Submissions</p>
                </GlassCard>
                <GlassCard className="p-4 text-center bg-green-500/10 border-green-500/20">
                    <p className="text-3xl font-bold text-green-400">{stats.excellent}</p>
                    <p className="text-green-400/80 text-sm">Excellent (80%+)</p>
                </GlassCard>
                <GlassCard className="p-4 text-center bg-yellow-500/10 border-yellow-500/20">
                    <p className="text-3xl font-bold text-yellow-400">{stats.good}</p>
                    <p className="text-yellow-400/80 text-sm">Good (50-79%)</p>
                </GlassCard>
                <GlassCard className="p-4 text-center bg-red-500/10 border-red-500/20">
                    <p className="text-3xl font-bold text-red-400">{stats.needsWork}</p>
                    <p className="text-red-400/80 text-sm">Needs Work (&lt;50%)</p>
                </GlassCard>
                <GlassCard className="p-4 text-center bg-purple-500/10 border-purple-500/20">
                    <p className="text-3xl font-bold text-purple-400">{Math.round(stats.avgScore * 100)}%</p>
                    <p className="text-purple-400/80 text-sm">Average Score</p>
                </GlassCard>
            </div>

            {/* Submissions List */}
            {submissions.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <Brain className="mx-auto text-white/20 mb-4" size={64} />
                    <h3 className="text-white font-bold text-lg mb-2">No Submissions Yet</h3>
                    <p className="text-white/50">Students haven't submitted any CNN diagrams for this course yet.</p>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-white">All Submissions</h2>
                    {submissions.map((submission) => (
                        <GlassCard
                            key={submission.id}
                            className={cn(
                                "overflow-hidden transition-all",
                                expandedId === submission.id ? "ring-2 ring-purple-500/50" : ""
                            )}
                        >
                            {/* Submission Header */}
                            <div
                                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                            >
                                <div className={cn(
                                    "w-16 h-16 rounded-xl flex items-center justify-center",
                                    getScoreBgColor(submission.correctness_score)
                                )}>
                                    <span className={cn("text-2xl font-bold", getScoreColor(submission.correctness_score))}>
                                        {submission.correctness_score !== null
                                            ? `${Math.round(submission.correctness_score * 100)}%`
                                            : 'N/A'}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-white/40" />
                                        <span className="text-white font-medium">Student #{submission.user_id}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            getScoreBgColor(submission.correctness_score),
                                            getScoreColor(submission.correctness_score)
                                        )}>
                                            {getScoreLabel(submission.correctness_score)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/40 text-sm">
                                        <Calendar size={12} />
                                        {new Date(submission.created_at).toLocaleString()}
                                    </div>
                                    {submission.extracted_structure?.layers && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {submission.extracted_structure.layers.slice(0, 5).map((layer, idx) => (
                                                <span
                                                    key={idx}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-xs",
                                                        layer.valid
                                                            ? "bg-green-500/20 text-green-400"
                                                            : "bg-red-500/20 text-red-400"
                                                    )}
                                                >
                                                    {layer.name}
                                                </span>
                                            ))}
                                            {submission.extracted_structure.layers.length > 5 && (
                                                <span className="text-white/40 text-xs">
                                                    +{submission.extracted_structure.layers.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <GlassButton
                                        className="!p-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSubmission(submission);
                                        }}
                                    >
                                        <Eye size={16} />
                                    </GlassButton>
                                    {expandedId === submission.id ? (
                                        <ChevronUp className="text-white/40" size={20} />
                                    ) : (
                                        <ChevronDown className="text-white/40" size={20} />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === submission.id && (
                                <div className="border-t border-white/10 p-4 bg-white/5">
                                    {/* Student Diagram Image */}
                                    <div className="mb-4">
                                        <h4 className="text-white font-medium mb-2">📷 Student's Diagram</h4>
                                        <div className="bg-white/5 rounded-xl p-2 inline-block">
                                            {imageUrls[submission.id] ? (
                                                <img
                                                    src={imageUrls[submission.id]}
                                                    alt="Student CNN Diagram"
                                                    className="max-h-64 rounded-lg"
                                                />
                                            ) : (
                                                <div className="h-32 w-48 flex items-center justify-center text-white/40">
                                                    Loading image...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* AI Feedback */}
                                        <div>
                                            <h4 className="text-white font-medium mb-2">AI Feedback</h4>
                                            <p className="text-white/70 text-sm">
                                                {submission.ai_feedback || 'No feedback available'}
                                            </p>
                                        </div>

                                        {/* Flow Validation */}
                                        <div>
                                            <h4 className="text-white font-medium mb-2">Flow Validation</h4>
                                            {submission.extracted_structure ? (
                                                <div className={cn(
                                                    "p-3 rounded-lg",
                                                    submission.extracted_structure.flow_valid
                                                        ? "bg-green-500/10 text-green-400"
                                                        : "bg-yellow-500/10 text-yellow-400"
                                                )}>
                                                    {submission.extracted_structure.flow_valid
                                                        ? "✓ Layer flow is valid"
                                                        : "⚠ Layer flow has issues"}
                                                </div>
                                            ) : (
                                                <p className="text-white/40 text-sm">N/A</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Correction Steps Summary */}
                                    {submission.extracted_structure?.correction_steps &&
                                        submission.extracted_structure.correction_steps.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="text-white font-medium mb-2">
                                                    Corrections Needed ({submission.extracted_structure.correction_steps.length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {submission.extracted_structure.correction_steps.map((step, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {step.step}
                                                            </span>
                                                            <span className="text-white/70">{step.action}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Full Detail Modal */}
            {selectedSubmission && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedSubmission(null)}
                >
                    <div
                        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f172a] rounded-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-[#0f172a] border-b border-white/10 p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white">Submission Details</h3>
                                <p className="text-white/60 text-sm">Student #{selectedSubmission.user_id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="text-white/60 hover:text-white p-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Diagram Image */}
                            <div>
                                <h4 className="text-white font-medium mb-3">📷 Student's Submitted Diagram</h4>
                                <div className="bg-white/5 rounded-xl p-4 flex justify-center">
                                    {imageUrls[selectedSubmission.id] ? (
                                        <img
                                            src={imageUrls[selectedSubmission.id]}
                                            alt="Student CNN Diagram"
                                            className="max-h-80 rounded-lg"
                                        />
                                    ) : (
                                        <div className="h-48 w-64 flex items-center justify-center text-white/40">
                                            Loading image...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Score */}
                            <div className="text-center">
                                <div className={cn(
                                    "inline-block px-8 py-4 rounded-2xl",
                                    getScoreBgColor(selectedSubmission.correctness_score)
                                )}>
                                    <p className={cn("text-5xl font-bold", getScoreColor(selectedSubmission.correctness_score))}>
                                        {selectedSubmission.correctness_score !== null
                                            ? `${Math.round(selectedSubmission.correctness_score * 100)}%`
                                            : 'Error'}
                                    </p>
                                    <p className={getScoreColor(selectedSubmission.correctness_score)}>
                                        {getScoreLabel(selectedSubmission.correctness_score)}
                                    </p>
                                </div>
                            </div>

                            {/* Layers */}
                            {selectedSubmission.extracted_structure?.layers && (
                                <div>
                                    <h4 className="text-white font-medium mb-3">Detected Layers</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSubmission.extracted_structure.layers.map((layer, idx) => (
                                            <span
                                                key={idx}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-sm flex items-center gap-1",
                                                    layer.valid
                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                                                )}
                                            >
                                                {layer.valid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                                {layer.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Feedback */}
                            <div>
                                <h4 className="text-white font-medium mb-2">AI Feedback</h4>
                                <p className="text-white/70 bg-white/5 rounded-xl p-4">
                                    {selectedSubmission.ai_feedback || 'No feedback available'}
                                </p>
                            </div>

                            {/* Correction Steps */}
                            {selectedSubmission.extracted_structure?.correction_steps &&
                                selectedSubmission.extracted_structure.correction_steps.length > 0 && (
                                    <div>
                                        <h4 className="text-white font-medium mb-3">Correction Steps Given</h4>
                                        <div className="space-y-3">
                                            {selectedSubmission.extracted_structure.correction_steps.map((step, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                                                            {step.step}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-white font-medium">{step.action}</p>
                                                            <p className="text-white/60 text-sm mt-1">
                                                                <span className="text-yellow-400">Where:</span> {step.where}
                                                            </p>
                                                            <p className="text-white/60 text-sm">
                                                                <span className="text-green-400">Why:</span> {step.why}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
