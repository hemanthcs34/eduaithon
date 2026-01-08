"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { letService, StudentLETDashboard } from "@/services/let";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Clock, TrendingUp, Eye, Focus, MessageCircle, ArrowLeft } from "lucide-react";

export default function TeacherStudentLETPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = parseInt(params.id as string);

    const [dashboard, setDashboard] = useState<StudentLETDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (studentId) {
            loadStudentDashboard();
        }
    }, [studentId]);

    const loadStudentDashboard = async () => {
        try {
            const data = await letService.getTeacherStudentLET(studentId);
            setDashboard(data);
        } catch (err: any) {
            console.error("Failed to load student LET:", err);
            setError(err.response?.data?.detail || "Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Loading student learning evidence...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-400">{error}</div>
            </div>
        );
    }

    if (!dashboard) return null;

    // Transform data for charts (same as student view)
    const clarityData = dashboard.concept_clarity_trend.dates.map((date, i) => ({
        date: new Date(date).toLocaleDateString(),
        clarity: dashboard.concept_clarity_trend.clarity_levels[i] === "high" ? 3 :
            dashboard.concept_clarity_trend.clarity_levels[i] === "medium" ? 2 : 1,
        label: dashboard.concept_clarity_trend.clarity_levels[i]
    }));

    const accuracyData = dashboard.observation_accuracy_trend.dates.map((date, i) => ({
        date: new Date(date).toLocaleDateString(),
        accuracy: dashboard.observation_accuracy_trend.accuracy_scores[i] * 100
    }));

    const focusData = dashboard.focus_distraction_trend.dates.map((date, i) => ({
        date: new Date(date).toLocaleDateString(),
        focus: dashboard.focus_distraction_trend.focus_minutes[i],
        distraction: dashboard.focus_distraction_trend.distraction_minutes[i]
    }));

    const doubtData = [
        { name: "Resolved", value: dashboard.doubt_resolution.resolved_doubts, color: "#10b981" },
        { name: "Pending", value: dashboard.doubt_resolution.pending_doubts, color: "#f59e0b" }
    ];

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1 bg-gradient-to-r from-secondary/20 to-accent/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Student Learning Evidence</h1>
                    <p className="text-white/60">Detailed view of student learning patterns</p>
                </div>
            </div>

            {/* Same graphs as student view */}
            {/* Graph 1: Concept Clarity Trend */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-white">Concept Clarity Trend</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={clarityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fff2" />
                        <XAxis dataKey="date" stroke="#fff8" />
                        <YAxis stroke="#fff8" ticks={[1, 2, 3]} tickFormatter={(v) => v === 3 ? "High" : v === 2 ? "Medium" : "Low"} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                            labelStyle={{ color: "#fff" }}
                            formatter={(value: any, name: any, props: any) => [props.payload.label, "Clarity"]}
                        />
                        <Line type="monotone" dataKey="clarity" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Graph 2: Observation Accuracy Trend */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-secondary" />
                    <h2 className="text-xl font-bold text-white">Observation Accuracy Trend</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accuracyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fff2" />
                        <XAxis dataKey="date" stroke="#fff8" />
                        <YAxis stroke="#fff8" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                            labelStyle={{ color: "#fff" }}
                            formatter={(value: any) => [`${value.toFixed(1)}%`, "Accuracy"]}
                        />
                        <Line type="monotone" dataKey="accuracy" stroke="#ec4899" strokeWidth={3} dot={{ fill: "#ec4899", r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Graph 3: Focus vs Distraction Trend */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Focus className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-white">Focus vs Distraction Trend</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={focusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fff2" />
                        <XAxis dataKey="date" stroke="#fff8" />
                        <YAxis stroke="#fff8" label={{ value: "Minutes", angle: -90, position: "insideLeft", fill: "#fff8" }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                            labelStyle={{ color: "#fff" }}
                        />
                        <Legend />
                        <Bar dataKey="focus" fill="#10b981" name="Focus Time" />
                        <Bar dataKey="distraction" fill="#ef4444" name="Distraction Time" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Graph 4: Doubt Resolution Flow */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-white">Doubt Resolution Flow</h2>
                </div>
                <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={250}>
                        <PieChart>
                            <Pie
                                data={doubtData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {doubtData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                            <div className="text-white/60 text-sm">Total Doubts</div>
                            <div className="text-2xl font-bold text-white">{dashboard.doubt_resolution.total_doubts}</div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-4">
                            <div className="text-green-400 text-sm">Resolved</div>
                            <div className="text-2xl font-bold text-green-400">{dashboard.doubt_resolution.resolved_doubts}</div>
                        </div>
                        <div className="bg-orange-500/10 rounded-lg p-4">
                            <div className="text-orange-400 text-sm">Pending</div>
                            <div className="text-2xl font-bold text-orange-400">{dashboard.doubt_resolution.pending_doubts}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-bold text-white">Learning Evidence Timeline</h2>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {dashboard.timeline.map((entry, index) => (
                        <div key={index} className="flex gap-4 pb-4 border-b border-white/10 last:border-0">
                            <div className="text-white/40 text-sm w-32 flex-shrink-0">
                                {new Date(entry.timestamp).toLocaleString()}
                            </div>
                            <div className="flex-1">
                                <div className="text-white">{entry.summary}</div>
                                <div className="text-xs text-white/40 mt-1 capitalize">{entry.type.replace(/_/g, " ")}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
