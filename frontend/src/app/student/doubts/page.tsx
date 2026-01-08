"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doubtService, Doubt, Session } from "@/services/doubt";
import DoubtList from "@/components/DoubtList";
import LiveSessionManager from "@/components/LiveSessionManager";

export default function StudentDoubtsPage() {
    const { user } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAsking, setIsAsking] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [courseId, setCourseId] = useState<number | null>(null);

    // Get enrolled course from URL or default to first enrolled
    useEffect(() => {
        // For simplicity, we'll use course 1. In production, get from context/params.
        setCourseId(1);
    }, []);

    const refreshData = async () => {
        if (!user || !courseId) return;
        try {
            setIsLoading(true);
            const [fetchedDoubts, fetchedSessions] = await Promise.all([
                doubtService.getDoubts(courseId),
                doubtService.getSessions(courseId)
            ]);
            setDoubts(fetchedDoubts);
            setSessions(fetchedSessions);
        } catch (err) {
            console.error("Failed to load doubts data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (courseId) refreshData();
    }, [user, courseId]);

    const handleAskDoubt = async () => {
        if (!newQuestion.trim() || !courseId) return;
        try {
            await doubtService.createDoubt(courseId, newQuestion);
            setNewQuestion("");
            setIsAsking(false);
            refreshData();
        } catch (err) {
            alert("Failed to post doubt");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-white">Loading Community Dashboard...</div>;

    const pendingDoubts = doubts.filter(d => d.status === "pending");

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Community Doubts</h1>
                    <p className="text-white/60 mt-1">
                        Ask questions and learn from the community.
                    </p>
                </div>

                <button
                    onClick={() => setIsAsking(true)}
                    className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow hover:opacity-90 transition font-medium"
                >
                    + Ask a Doubt
                </button>
            </div>

            {/* Live Session Section */}
            {courseId && (
                <LiveSessionManager
                    sessions={sessions}
                    pendingDoubts={pendingDoubts}
                    courseId={courseId}
                    onSessionScheduled={refreshData}
                />
            )}

            {/* Ask Doubt Modal */}
            {isAsking && (
                <div className="mb-8 p-6 glass-panel rounded-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg text-white mb-2">Ask a Question</h3>
                    <p className="text-sm text-white/60 mb-4">
                        Your question will be visible to all students to help everyone learn.
                        Teachers will respond as soon as possible.
                    </p>
                    <textarea
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary min-h-[100px] text-white placeholder-white/40"
                        placeholder="Type your question here..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => setIsAsking(false)}
                            className="px-4 py-2 text-white/60 hover:text-white transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAskDoubt}
                            className="px-6 py-2 bg-primary text-white rounded font-medium hover:bg-primary/80 transition"
                        >
                            Post Question
                        </button>
                    </div>
                </div>
            )}

            {/* Doubts List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2">
                    Recent Discussions
                    <span className="ml-3 text-sm font-normal text-white/50 bg-white/10 px-2 py-1 rounded-full">
                        {doubts.length}
                    </span>
                </h2>

                <DoubtList
                    doubts={doubts}
                    onReplySuccess={refreshData}
                />
            </div>
        </div>
    );
}
