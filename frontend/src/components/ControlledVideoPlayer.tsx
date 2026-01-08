"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import AttentionMonitor from '@/components/AttentionMonitor';

interface ControlledVideoPlayerProps {
    videoId: number;
    src: string;
    onProgressUpdate?: (progress: { completed: boolean; watchedSeconds: number }) => void;
    className?: string;
    isMandatory?: boolean; // Defaults to true
}

export default function ControlledVideoPlayer({
    videoId,
    src,
    onProgressUpdate,
    className = "",
    isMandatory = true
}: ControlledVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [maxWatched, setMaxWatched] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch initial progress
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await api.get(`/videos/${videoId}/progress`);
                if (res.data.max_watched_seconds > 0) {
                    setMaxWatched(res.data.max_watched_seconds);
                    setCurrentTime(res.data.watched_seconds);
                    // Set video to last position
                    if (videoRef.current) {
                        videoRef.current.currentTime = res.data.watched_seconds;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch progress', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [videoId]);

    // Save progress periodically
    const saveProgress = useCallback(async () => {
        if (!videoRef.current) return;

        const currentPos = videoRef.current.currentTime;
        const totalDuration = videoRef.current.duration;

        try {
            const res = await api.post(`/videos/${videoId}/progress`, {
                watched_seconds: currentPos,
                total_seconds: totalDuration
            });

            setMaxWatched(res.data.max_watched_seconds);

            if (onProgressUpdate) {
                onProgressUpdate({
                    completed: res.data.completed,
                    watchedSeconds: currentPos
                });
            }
        } catch (err) {
            console.error('Failed to save progress', err);
        }
    }, [videoId, onProgressUpdate]);

    // Start/stop progress saving interval
    useEffect(() => {
        if (isPlaying) {
            progressIntervalRef.current = setInterval(saveProgress, 5000); // Save every 5 seconds
        } else {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            saveProgress(); // Save on pause
        }

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [isPlaying, saveProgress]);

    // Handle seeking - prevent seeking past max watched if mandatory
    const handleSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        if (!isMandatory) return; // Allow free seeking for non-mandatory videos

        const video = e.currentTarget;
        // Allow seeking backward freely, but not forward past max watched + small buffer
        const allowedMax = maxWatched + 2; // 2 second buffer for smooth playback

        if (video.currentTime > allowedMax) {
            video.currentTime = maxWatched;
        }
    };

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        setCurrentTime(video.currentTime);

        // Update max watched if we're past it
        if (video.currentTime > maxWatched) {
            setMaxWatched(video.currentTime);
        }
    };

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        setDuration(e.currentTarget.duration);
        // Restore position after metadata loads
        if (currentTime > 0 && videoRef.current) {
            videoRef.current.currentTime = currentTime;
        }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = async () => {
        setIsPlaying(false);
        if (videoRef.current) {
            try {
                // Force update with full duration to ensure completion
                await api.post(`/videos/${videoId}/progress`, {
                    watched_seconds: videoRef.current.duration,
                    total_seconds: videoRef.current.duration
                });
                // Trigger update
                if (onProgressUpdate) {
                    // We can't easily get the response here without duplicating logic, 
                    // but the next fetch or prop update will handle it.
                    // Or we can just call the onProgressUpdate callback with assumed success.
                    // Better to just let the parent fetch.
                    onProgressUpdate({ completed: true, watchedSeconds: videoRef.current.duration });
                }
            } catch (e) {
                console.error("Failed to mark video as complete", e);
            }
        }
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const maxWatchedPercent = duration > 0 ? (maxWatched / duration) * 100 : 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
            <video
                ref={videoRef}
                src={src}
                className="w-full aspect-video"
                controls
                onSeeking={handleSeeking}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
            />

            {/* Attention Monitor Overlay (Optional Focus Mode) */}
            <AttentionMonitor
                isVideoPlaying={isPlaying}
                onPauseVideo={() => videoRef.current?.pause()}
                onResumeVideo={() => videoRef.current?.play()}
            />

            {/* Custom progress overlay showing max watched position */}
            <div className="absolute bottom-16 left-0 right-0 px-4">
                <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
                    {/* Max watched indicator */}
                    <div
                        className="absolute h-full bg-green-500/50"
                        style={{ width: `${maxWatchedPercent}%` }}
                    />
                    {/* Current progress */}
                    <div
                        className="absolute h-full bg-primary"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-green-400">Max: {formatTime(maxWatched)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
            )}
        </div>
    );
}
