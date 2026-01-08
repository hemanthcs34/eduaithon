"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doubtService, Doubt, Session } from "@/services/doubt";
import DoubtList from "@/components/DoubtList";
import LiveSessionManager from "@/components/LiveSessionManager";

export default function TeacherDoubtsPage() {
    const { user } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [courseId, setCourseId] = useState<number | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");

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

    if (isLoading) return <div className="p-8 text-center text-white">Loading Doubt Dashboard...</div>;

    const pendingDoubts = doubts.filter(d => d.status === "pending");
    const filteredDoubts = filter === "all"
        ? doubts
        : doubts.filter(d => d.status === filter);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Student Doubts</h1>
                    <p className="text-white/60 mt-1">
                        Manage student questions and schedule live sessions.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/60">Filter:</span>
                    {(["all", "pending", "answered"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-full capitalize transition ${filter === f
                                ? "bg-primary text-white"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-3xl font-bold text-white">{doubts.length}</div>
                    <div className="text-white/60 text-sm">Total Doubts</div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-400">{pendingDoubts.length}</div>
                    <div className="text-white/60 text-sm">Pending</div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-3xl font-bold text-green-400">{doubts.length - pendingDoubts.length}</div>
                    <div className="text-white/60 text-sm">Answered</div>
                </div>
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

            {/* Doubts List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2">
                    {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)} Doubts
                    <span className="ml-3 text-sm font-normal text-white/50 bg-white/10 px-2 py-1 rounded-full">
                        {filteredDoubts.length}
                    </span>
                </h2>

                <DoubtList
                    doubts={filteredDoubts}
                    onReplySuccess={refreshData}
                />
            </div>
        </div>
    );
}
