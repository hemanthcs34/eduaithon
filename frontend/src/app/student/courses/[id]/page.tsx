"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import ControlledVideoPlayer from '@/components/ControlledVideoPlayer';
import AIChatbot from '@/components/AIChatbot';
import QuizModal from '@/components/QuizModal';
import { GlassCard, GlassButton } from '@/components/ui/glass';
import { CheckCircle, Lock, PlayCircle, Loader2, Award, Brain } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface VideoProgress {
    video_id: number;
    video_title: string;
    order_index: number;
    watched_seconds: number;
    total_seconds: number;
    max_watched_seconds: number;
    completed: boolean;
    can_access: boolean;
    quiz_required?: number;
}

interface Video {
    id: number;
    title: string;
    order_index: number;
    url: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
    videos: Video[];
}

interface ProgressResponse {
    videos: VideoProgress[];
    quiz_needed: boolean;
    quiz_checkpoint: number | null;
    passed_checkpoints: number[];
}

export default function CoursePlayerPage() {
    const { id } = useParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [progress, setProgress] = useState<VideoProgress[]>([]);
    const [activeVideo, setActiveVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [quizNeeded, setQuizNeeded] = useState(false);
    const [quizCheckpoint, setQuizCheckpoint] = useState<number | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);

    const fetchProgress = React.useCallback(async () => {
        try {
            const progressRes = await api.get(`/videos/course/${id}/progress`);
            const data = progressRes.data as ProgressResponse;
            setProgress(data.videos || []);
            setQuizNeeded(data.quiz_needed);
            setQuizCheckpoint(data.quiz_checkpoint);
            return data;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [id]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch course details
                const courseRes = await api.get(`/courses/${id}`);
                setCourse(courseRes.data);

                // Fetch progress for this course
                const progressData = await fetchProgress();

                // Set first accessible video as active
                if (courseRes.data?.videos?.length > 0 && progressData?.videos) {
                    const videos = progressData.videos;
                    const firstAccessible = videos.find((p: VideoProgress) => p.can_access && !p.completed)
                        || videos.find((p: VideoProgress) => p.can_access)
                        || null;

                    if (firstAccessible) {
                        const video = courseRes.data.videos.find((v: Video) => v.id === firstAccessible.video_id);
                        setActiveVideo(video || courseRes.data.videos[0]);
                    } else {
                        setActiveVideo(courseRes.data.videos[0]);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleVideoSelect = (video: Video) => {
        const videoProgress = progress.find(p => p.video_id === video.id);
        if (videoProgress?.can_access) {
            setActiveVideo(video);
        } else if (videoProgress?.quiz_required) {
            // Show quiz required message
            setQuizCheckpoint(videoProgress.quiz_required);
            setShowQuiz(true);
        }
    };

    const handleProgressUpdate = React.useCallback(async () => {
        await fetchProgress();
    }, [fetchProgress]);

    const handleQuizComplete = async (passed: boolean) => {
        setShowQuiz(false);
        if (passed) {
            await fetchProgress();
        }
    };

    const getProgressPercent = (videoId: number) => {
        const p = progress.find(pr => pr.video_id === videoId);
        if (!p || p.total_seconds === 0) return 0;
        return Math.round((p.max_watched_seconds / p.total_seconds) * 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (!course) {
        return <div className="text-white">Course not found</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-6rem)]">
            <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Quiz notification banner */}
                {quizNeeded && quizCheckpoint && (
                    <GlassCard className="bg-yellow-500/10 border-yellow-500/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className="text-yellow-400" size={24} />
                                <div>
                                    <p className="text-white font-bold">Quiz Required!</p>
                                    <p className="text-white/60 text-sm">Complete the quiz to unlock more videos</p>
                                </div>
                            </div>
                            <GlassButton onClick={() => setShowQuiz(true)}>
                                Take Quiz
                            </GlassButton>
                        </div>
                    </GlassCard>
                )}

                {activeVideo ? (
                    <div className="space-y-4">
                        <ControlledVideoPlayer
                            videoId={activeVideo.id}
                            src={`http://localhost:8001/api/v1/videos/${activeVideo.id}/stream`}
                            onProgressUpdate={handleProgressUpdate}
                            className="w-full"
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-white">{activeVideo.title}</h1>
                            <p className="text-white/60">Module {activeVideo.order_index}</p>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                        <p className="text-white/50">No video selected</p>
                    </div>
                )}

                {/* Diagram Intelligence Tutor Link */}
                <Link href={`/student/courses/${id}/diagram-tutor`}>
                    <GlassCard className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Brain className="text-purple-400" size={20} />
                            </div>
                            <div>
                                <p className="text-white font-bold">Diagram Intelligence Tutor</p>
                                <p className="text-white/60 text-sm">Upload CNN diagrams for AI analysis</p>
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                {/* AI Tutor Chatbot */}
                <AIChatbot courseId={Number(id)} className="flex-1 min-h-[300px] border-accent/20" />
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
                <h3 className="font-bold text-white px-2">Course Content</h3>
                {course.videos?.sort((a, b) => a.order_index - b.order_index).map((video: Video, idx: number) => {
                    const videoProgress = progress.find(p => p.video_id === video.id);
                    const canAccess = videoProgress?.can_access ?? (idx === 0);
                    const isCompleted = videoProgress?.completed ?? false;
                    const progressPercent = getProgressPercent(video.id);
                    const quizRequired = videoProgress?.quiz_required;

                    return (
                        <GlassCard
                            key={video.id}
                            className={cn(
                                "group transition-all p-4 border border-transparent relative overflow-hidden",
                                activeVideo?.id === video.id ? "border-primary/50 bg-primary/10" : "",
                                canAccess ? "cursor-pointer hover:bg-white/10" : "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => handleVideoSelect(video)}
                        >
                            {/* Progress bar background */}
                            <div
                                className="absolute bottom-0 left-0 h-1 bg-green-500/50"
                                style={{ width: `${progressPercent}%` }}
                            />

                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                                    isCompleted ? "bg-green-500/20 text-green-400" :
                                        !canAccess ? "bg-white/5 text-white/20" :
                                            activeVideo?.id === video.id ? "bg-primary/20 text-primary" :
                                                "bg-white/5 text-white/40 group-hover:text-primary"
                                )}>
                                    {isCompleted ? <CheckCircle size={16} /> :
                                        !canAccess ? <Lock size={14} /> :
                                            <PlayCircle size={16} />}
                                </div>
                                <div className="flex-1">
                                    <p className={cn(
                                        "text-sm font-medium",
                                        activeVideo?.id === video.id ? "text-primary" :
                                            isCompleted ? "text-green-400" :
                                                !canAccess ? "text-white/40" : "text-white/80"
                                    )}>
                                        {video.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-white/40">Video {idx + 1}</p>
                                        {progressPercent > 0 && progressPercent < 100 && (
                                            <span className="text-xs text-primary">{progressPercent}%</span>
                                        )}
                                        {quizRequired && (
                                            <span className="text-xs text-yellow-400">Quiz Required</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Quiz Modal */}
            {showQuiz && quizCheckpoint && (
                <QuizModal
                    courseId={Number(id)}
                    checkpoint={quizCheckpoint}
                    onComplete={handleQuizComplete}
                    onClose={() => setShowQuiz(false)}
                />
            )}
        </div>
    );
}
