"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doubtService, Doubt, Session } from "@/services/doubt";
import DoubtList from "@/components/DoubtList";
import LiveSessionManager from "@/components/LiveSessionManager";

export default function DoubtsPage() {
    const { user, token } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAsking, setIsAsking] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");

    // Hardcoded for now, normally from context/route param
    // Assuming user is always in a "default" course for this demo or we pick the first one
    const COURSE_ID = 1;

    const refreshData = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const [fetchedDoubts, fetchedSessions] = await Promise.all([
                doubtService.getDoubts(COURSE_ID),
                doubtService.getSessions(COURSE_ID)
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
        refreshData();
    }, [token]);

    const handleAskDoubt = async () => {
        if (!newQuestion.trim()) return;
        try {
            await doubtService.createDoubt(COURSE_ID, newQuestion);
            setNewQuestion("");
            setIsAsking(false);
            refreshData();
        } catch (err) {
            alert("Failed to post doubt");
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading Community Dashboard...</div>;

    const pendingDoubts = doubts.filter(d => d.status === "pending");

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Community Doubt Solving</h1>
                    <p className="text-gray-500 mt-1">
                        {user?.role === "teacher"
                            ? "Manage student doubts and schedule live sessions."
                            : "Ask questions and learn from the community."}
                    </p>
                </div>

                {user?.role === "student" && (
                    <button
                        onClick={() => setIsAsking(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                    >
                        + Ask a Doubt
                    </button>
                )}
            </div>

            {/* Live Session Section */}
            <LiveSessionManager
                sessions={sessions}
                pendingDoubts={pendingDoubts} // Pass pending doubts for Teacher Reminder
                courseId={COURSE_ID}
                onSessionScheduled={refreshData}
            />

            {/* Ask Doubt Modal (Simple inline for now) */}
            {isAsking && (
                <div className="mb-8 p-6 bg-white rounded-xl shadow border border-blue-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-2">Ask a Question</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Your question will be visible to all students to help everyone learn.
                        Teachers will respond as soon as possible.
                    </p>
                    <textarea
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder="Type your question here..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => setIsAsking(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAskDoubt}
                            className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                        >
                            Post Question
                        </button>
                    </div>
                </div>
            )}

            {/* Doubts List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold border-b pb-2">
                    Recent Discussions
                    <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
