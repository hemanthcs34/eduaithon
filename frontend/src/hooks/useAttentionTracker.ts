"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Configuration
const DISTRACTION_THRESHOLD_MS = 10000; // 10 seconds
const DETECTION_INTERVAL_MS = 500; // Check every 500ms
const TREND_WINDOW_MS = 300000; // 5 minutes
const BREAK_SUGGESTION_THRESHOLD = 3; // Trigger after 3 distraction events

interface AttentionState {
    isTracking: boolean;
    isFaceDetected: boolean;
    distractionEvents: number;
    currentDistractionDuration: number;
    shouldSuggestBreak: boolean;
    totalFocusedTime: number;
    totalDistractedTime: number;
}

interface UseAttentionTrackerReturn extends AttentionState {
    startTracking: () => Promise<void>;
    stopTracking: () => void;
    dismissBreakSuggestion: () => void;
    resetStats: () => void;
}

export function useAttentionTracker(): UseAttentionTrackerReturn {
    const [state, setState] = useState<AttentionState>({
        isTracking: false,
        isFaceDetected: true,
        distractionEvents: 0,
        currentDistractionDuration: 0,
        shouldSuggestBreak: false,
        totalFocusedTime: 0,
        totalDistractedTime: 0,
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const detectorRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const distractionStartRef = useRef<number | null>(null);
    const lastDetectionRef = useRef<number>(Date.now());
    const eventTimestampsRef = useRef<number[]>([]);

    // Initialize MediaPipe Face Detector
    const initializeDetector = useCallback(async () => {
        try {
            const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            const detector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                    delegate: "GPU"
                },
                runningMode: "IMAGE",
                minDetectionConfidence: 0.5
            });

            detectorRef.current = detector;
            return true;
        } catch (err) {
            console.error("Failed to initialize face detector:", err);
            return false;
        }
    }, []);

    // Start webcam and tracking
    const startTracking = useCallback(async () => {
        try {
            // Get webcam stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" }
            });
            streamRef.current = stream;

            // Create video element
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            videoRef.current = video;

            // Create canvas for detection
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 240;
            canvasRef.current = canvas;

            // Wait for video to be ready
            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });

            // Initialize detector
            const initialized = await initializeDetector();
            if (!initialized) {
                throw new Error("Could not initialize face detector");
            }

            setState(prev => ({ ...prev, isTracking: true }));

            // Start detection loop
            intervalRef.current = setInterval(async () => {
                if (!videoRef.current || !canvasRef.current || !detectorRef.current) return;

                const ctx = canvasRef.current.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(videoRef.current, 0, 0, 320, 240);

                try {
                    const results = detectorRef.current.detect(canvasRef.current);
                    const faceDetected = results.detections && results.detections.length > 0;
                    const now = Date.now();

                    setState(prev => {
                        let newState = { ...prev, isFaceDetected: faceDetected };

                        if (faceDetected) {
                            // Face is present - reset distraction timer
                            if (distractionStartRef.current !== null) {
                                const distractionDuration = now - distractionStartRef.current;
                                newState.totalDistractedTime += distractionDuration;
                                distractionStartRef.current = null;
                            }
                            newState.currentDistractionDuration = 0;
                            newState.totalFocusedTime += DETECTION_INTERVAL_MS;
                        } else {
                            // Face absent - track distraction
                            if (distractionStartRef.current === null) {
                                distractionStartRef.current = now;
                            }

                            const duration = now - distractionStartRef.current;
                            newState.currentDistractionDuration = duration;

                            // Check if threshold crossed (new distraction event)
                            if (duration >= DISTRACTION_THRESHOLD_MS &&
                                now - lastDetectionRef.current > DISTRACTION_THRESHOLD_MS) {
                                newState.distractionEvents++;
                                lastDetectionRef.current = now;
                                eventTimestampsRef.current.push(now);

                                // Clean old events outside trend window
                                eventTimestampsRef.current = eventTimestampsRef.current.filter(
                                    t => now - t < TREND_WINDOW_MS
                                );

                                // Check if should suggest break
                                if (eventTimestampsRef.current.length >= BREAK_SUGGESTION_THRESHOLD) {
                                    newState.shouldSuggestBreak = true;
                                }
                            }
                        }

                        return newState;
                    });
                } catch (err) {
                    // Silent fail for detection errors
                }
            }, DETECTION_INTERVAL_MS);

        } catch (err) {
            console.error("Failed to start attention tracking:", err);
            alert("Could not access webcam. Please check permissions.");
        }
    }, [initializeDetector]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (detectorRef.current) {
            detectorRef.current.close();
            detectorRef.current = null;
        }

        videoRef.current = null;
        canvasRef.current = null;
        distractionStartRef.current = null;

        setState(prev => ({ ...prev, isTracking: false }));
    }, []);

    // Dismiss break suggestion
    const dismissBreakSuggestion = useCallback(() => {
        setState(prev => ({ ...prev, shouldSuggestBreak: false }));
        eventTimestampsRef.current = []; // Reset event counter
    }, []);

    // Reset all stats
    const resetStats = useCallback(() => {
        setState(prev => ({
            ...prev,
            distractionEvents: 0,
            totalFocusedTime: 0,
            totalDistractedTime: 0,
            shouldSuggestBreak: false,
        }));
        eventTimestampsRef.current = [];
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return {
        ...state,
        startTracking,
        stopTracking,
        dismissBreakSuggestion,
        resetStats,
    };
}
