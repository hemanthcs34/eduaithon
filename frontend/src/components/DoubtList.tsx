"use client";

import { useState } from "react";
import { Doubt, doubtService } from "@/services/doubt";
import { useAuth } from "@/context/AuthContext";

interface DoubtListProps {
    doubts: Doubt[];
    onReplySuccess: () => void;
}

export default function DoubtList({ doubts, onReplySuccess }: DoubtListProps) {
    const { user } = useAuth();
    const [replyText, setReplyText] = useState("");
    const [activeDoubtId, setActiveDoubtId] = useState<number | null>(null);

    const handleReply = async (doubtId: number) => {
        if (!replyText.trim()) return;
        try {
            await doubtService.replyDoubt(doubtId, replyText);
            setReplyText("");
            setActiveDoubtId(null);
            onReplySuccess();
        } catch (err) {
            alert("Failed to submit reply");
        }
    };

    return (
        <div className="space-y-4">
            {doubts.length === 0 && (
                <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                    No doubts asked yet. Be the first!
                </div>
            )}

            {doubts.map((doubt) => (
                <div key={doubt.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="font-semibold text-gray-800">{doubt.student_name || "Student"}</span>
                            <span className="text-sm text-gray-500 ml-2">
                                {new Date(doubt.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${doubt.status === "answered"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {doubt.status.toUpperCase()}
                        </span>
                    </div>

                    {/* Question */}
                    <p className="text-gray-800 mb-3 font-medium bg-gray-50 p-3 rounded">
                        {doubt.question_text}
                    </p>

                    {/* Teacher Reply */}
                    {doubt.teacher_reply && (
                        <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            <div className="text-xs text-blue-600 font-bold mb-1">TEACHER REPLY</div>
                            <p className="text-gray-700">{doubt.teacher_reply}</p>
                        </div>
                    )}

                    {/* Teacher Reply Input (Only for Teachers + Pending/Answered) */}
                    {user?.role === "teacher" && (
                        <div className="mt-3">
                            {activeDoubtId === doubt.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full p-2 bg-white/90 border-2 border-gray-300 rounded text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        placeholder="Write your explanation..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setActiveDoubtId(null)}
                                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleReply(doubt.id)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Submit Answer
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setActiveDoubtId(doubt.id)}
                                    className="text-sm text-blue-600 hover:underline font-medium"
                                >
                                    {doubt.teacher_reply ? "Edit Reply" : "Reply to Student"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
