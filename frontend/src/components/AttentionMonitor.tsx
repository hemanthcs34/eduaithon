"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Coffee, X, Play, AlertCircle } from "lucide-react";
import { useAttentionTracker } from "@/hooks/useAttentionTracker";

interface AttentionMonitorProps {
    onPauseVideo?: () => void;
    onResumeVideo?: () => void;
    isVideoPlaying?: boolean;
    onStatsUpdate?: (stats: { focusedTime: number; distractedTime: number }) => void;
}

const BREAK_DURATION_MS = 300000; // 5 minutes

export default function AttentionMonitor({
    onPauseVideo,
    onResumeVideo,
    isVideoPlaying = false,
    onStatsUpdate,
}: AttentionMonitorProps) {
    const {
        isTracking,
        isFaceDetected,
        distractionEvents,
        currentDistractionDuration,
        shouldSuggestBreak,
        startTracking,
        stopTracking,
        dismissBreakSuggestion,
        detectionScore,
        resetStats,
        totalFocusedTime,
        totalDistractedTime,
    } = useAttentionTracker();

    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakTimeLeft, setBreakTimeLeft] = useState(0);
    const [showBreakEndAlert, setShowBreakEndAlert] = useState(false);
    const [pauseNotification, setPauseNotification] = useState<string | null>(null);
    const lastProcessedEventRef = React.useRef(0);

    // React to distraction events (1 & 2: Pause, 3: Break Suggestion)
    useEffect(() => {
        // Only trigger if we haven't processed this event count yet
        if (distractionEvents > lastProcessedEventRef.current) {
            if (distractionEvents > 0 && distractionEvents < 3) {
                onPauseVideo?.();
                setPauseNotification(`Distraction detected (${distractionEvents}/3). Video paused.`);
                setTimeout(() => setPauseNotification(null), 4000);
            }
            lastProcessedEventRef.current = distractionEvents;
        }

        // Always enforce pause for break suggestion (modal blocks view anyway)
        if (shouldSuggestBreak) {
            onPauseVideo?.();
        }
    }, [distractionEvents, shouldSuggestBreak, onPauseVideo]);

    // Send stats to parent for LET logging
    useEffect(() => {
        if (onStatsUpdate && isTracking) {
            onStatsUpdate({
                focusedTime: totalFocusedTime,
                distractedTime: totalDistractedTime
            });
        }
    }, [totalFocusedTime, totalDistractedTime, isTracking, onStatsUpdate]);

    // Handle break timer
    useEffect(() => {
        if (!isOnBreak) return;

        const interval = setInterval(() => {
            setBreakTimeLeft(prev => {
                if (prev <= 1000) {
                    clearInterval(interval);
                    setIsOnBreak(false);
                    setShowBreakEndAlert(true);
                    // Play gentle alert sound
                    try {
                        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGMvNntv");
                        audio.volume = 0.3;
                        audio.play().catch(() => { });
                    } catch { }
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOnBreak]);

    // Handle consent and start tracking
    const handleEnableFocusMode = useCallback(async () => {
        setShowConsentModal(false);
        await startTracking();
    }, [startTracking]);

    // Take a break
    const handleTakeBreak = useCallback(() => {
        resetStats(); // Reset distraction counter
        // dismissBreakSuggestion is implicit in resetStats (state reset)
        setIsOnBreak(true);
        setBreakTimeLeft(BREAK_DURATION_MS);
        onPauseVideo?.();
    }, [resetStats, onPauseVideo]);

    // End break early
    const handleEndBreak = useCallback(() => {
        setIsOnBreak(false);
        setBreakTimeLeft(0);
        onResumeVideo?.();
    }, [onResumeVideo]);

    // Dismiss break end alert
    const handleDismissBreakEnd = useCallback(() => {
        setShowBreakEndAlert(false);
        onResumeVideo?.();
    }, [onResumeVideo]);

    // Format time
    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
        <>
            {/* Toggle Button */}
            <div className="absolute top-4 right-4 z-50">
                {!isTracking ? (
                    <button
                        onClick={() => setShowConsentModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white/80 text-sm transition-all"
                        title="Enable Focus Mode"
                    >
                        <Eye size={16} />
                        <span className="hidden sm:inline">Focus Mode</span>
                    </button>
                ) : (
                    <button
                        onClick={stopTracking}
                        className={`flex items-center gap-2 px-3 py-2 backdrop-blur-md rounded-lg text-sm transition-all ${isFaceDetected
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                            }`}
                        title="Disable Focus Mode"
                    >
                        {isFaceDetected ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="hidden sm:inline">
                            {isFaceDetected
                                ? `Focused (${Math.round(detectionScore * 100)}%)`
                                : `Away ${Math.floor(currentDistractionDuration / 1000)}s (${Math.round(detectionScore * 100)}%)`}
                        </span>
                    </button>
                )}
            </div>

            {/* Stats Overlay (subtle) */}
            {isTracking && (
                <div className="absolute top-4 left-4 z-40 text-xs font-mono bg-black/50 px-2 py-1 rounded text-white/70">
                    Distractions: {distractionEvents} / 3
                </div>
            )}

            {/* Auto-Pause Notification */}
            <AnimatePresence>
                {pauseNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2"
                    >
                        <EyeOff size={16} />
                        {pauseNotification}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Consent Modal */}
            <AnimatePresence>
                {showConsentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Eye className="text-blue-400" size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-white">Enable Focus Mode</h3>
                            </div>

                            <div className="space-y-3 text-white/70 text-sm">
                                <p>Focus Mode uses your camera to gently track your attention. If you seem distracted for a while, we&apos;ll suggest a short break.</p>

                                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                                    <p className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> No video is recorded or stored
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> All processing happens locally
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span> You can disable it anytime
                                    </p>
                                </div>

                                <p className="text-white/50 text-xs">
                                    This is for your wellbeing, not monitoring. You&apos;re always in control.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConsentModal(false)}
                                    className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEnableFocusMode}
                                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
                                >
                                    Enable Camera
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Break Suggestion Modal */}
            <AnimatePresence>
                {shouldSuggestBreak && !isOnBreak && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <Coffee className="text-amber-400" size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-white">Need a Break?</h3>
                            </div>

                            <p className="text-white/70 text-sm">
                                You seem to be getting distracted more often. Taking a short break can help you refocus and learn more effectively.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={dismissBreakSuggestion}
                                    className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
                                >
                                    Continue Anyway
                                </button>
                                <button
                                    onClick={handleTakeBreak}
                                    className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Coffee size={16} />
                                    Take 5-min Break
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Break Timer Overlay */}
            <AnimatePresence>
                {isOnBreak && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="text-center space-y-6"
                        >
                            <Coffee className="mx-auto text-amber-400" size={64} />
                            <h2 className="text-3xl font-bold text-white">Break Time</h2>
                            <p className="text-white/60">Relax, stretch, look away from the screen</p>

                            <div className="text-6xl font-mono font-bold text-white">
                                {formatTime(breakTimeLeft)}
                            </div>

                            <button
                                onClick={handleEndBreak}
                                className="mt-8 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <Play size={20} />
                                Resume Early
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Break End Alert */}
            <AnimatePresence>
                {showBreakEndAlert && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 text-center"
                        >
                            <AlertCircle className="mx-auto text-green-400" size={48} />
                            <h3 className="text-xl font-semibold text-white">Break Time&apos;s Over!</h3>
                            <p className="text-white/70 text-sm">Ready to continue learning?</p>
                            <button
                                onClick={handleDismissBreakEnd}
                                className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={20} />
                                Resume Video
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
