"use client";

import { useState } from "react";
import { Session, doubtService, Doubt } from "@/services/doubt";
import { useAuth } from "@/context/AuthContext";

interface LiveSessionManagerProps {
    sessions: Session[];
    pendingDoubts: Doubt[]; // Needed for reminder view
    courseId: number;
    onSessionScheduled: () => void;
}

export default function LiveSessionManager({ sessions, pendingDoubts, courseId, onSessionScheduled }: LiveSessionManagerProps) {
    const { user } = useAuth();
    const [isScheduling, setIsScheduling] = useState(false);
    const [sessionDate, setSessionDate] = useState("");
    const [meetingLink, setMeetingLink] = useState("");

    const handleSchedule = async () => {
        if (!sessionDate || !meetingLink.trim()) {
            alert("Please provide both date and meeting link");
            return;
        }
        try {
            await doubtService.scheduleSession(courseId, sessionDate, meetingLink);
            setIsScheduling(false);
            setSessionDate("");
            setMeetingLink("");
            onSessionScheduled();
        } catch (err) {
            alert("Failed to schedule session");
        }
    };

    const nextSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    return (
        <div className="mb-8">
            {/* Active Session Banner */}
            {nextSession ? (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold mb-1">🔴 Live Doubt Clearing Session</h3>
                            <p className="opacity-90">
                                Scheduled for: <strong>{new Date(nextSession.session_date).toLocaleString()}</strong>
                            </p>
                            {nextSession.meeting_link && (
                                <a
                                    href={nextSession.meeting_link}
                                    target="_blank"
                                    className="inline-block mt-3 px-4 py-2 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    Join Session
                                </a>
                            )}
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-3xl font-bold">{pendingDoubts.length}</div>
                            <div className="text-sm opacity-80">Pending Doubts</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-gray-500 text-sm italic mb-4">No live sessions scheduled.</div>
            )}

            {/* Teacher Scheduler */}
            {user?.role === "teacher" && (
                <div className="mt-6 border-t pt-6">
                    {!isScheduling ? (
                        <button
                            onClick={() => setIsScheduling(true)}
                            className="flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-800"
                        >
                            <span>+ Schedule New Live Session</span>
                        </button>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-4">
                            <h4 className="font-bold text-gray-700 mb-3">Schedule Session</h4>

                            {/* Reminder / Helper List */}
                            <div className="mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-800">
                                <strong>Teacher Tip:</strong> There are currently <strong>{pendingDoubts.length} pending doubts</strong>.
                                Scheduling a session will notify all students.
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-2 bg-white/90 border-2 border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        value={sessionDate}
                                        onChange={(e) => setSessionDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Google Meet / Zoom URL"
                                        className="w-full p-2 bg-white/90 border-2 border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        value={meetingLink}
                                        onChange={(e) => setMeetingLink(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsScheduling(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSchedule}
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                                >
                                    Confirm Schedule
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
