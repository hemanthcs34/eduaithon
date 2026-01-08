"use client";

import { useEffect, useState } from "react";
import { letService, TeacherLETOverview } from "@/services/let";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, MessageCircle, Eye } from "lucide-react";

export default function TeacherLETOverviewPage() {
    const [overview, setOverview] = useState<TeacherLETOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        loadOverview();
    }, []);

    const loadOverview = async () => {
        try {
            const data = await letService.getTeacherOverview();
            setOverview(data);
        } catch (err: any) {
            console.error("Failed to load teacher overview:", err);
            setError(err.response?.data?.detail || "Failed to load overview");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Loading student overview...</div>
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

    if (!overview) return null;

    const getTrendColor = (trend: string) => {
        if (trend === "Improving") return "text-green-400";
        if (trend === "Inconsistent") return "text-orange-400";
        return "text-white/60";
    };

    const getAttentionColor = (pattern: string) => {
        return pattern.includes("Fatigue") ? "text-orange-400" : "text-green-400";
    };

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-secondary/20 to-accent/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 text-secondary" />
                    <h1 className="text-3xl font-bold text-white">Learning Evidence Overview</h1>
                </div>
                <p className="text-white/60">Monitor student learning patterns and engagement</p>
            </div>

            {overview.students.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-white/40" />
                    <p className="text-xl text-white/40">No students enrolled yet</p>
                </div>
            ) : (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-white font-semibold">Name</th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">USN</th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">Year</th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">Branch</th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Trend
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">
                                        <div className="flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            Doubts
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-4 h-4" />
                                            Attention
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-white font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.students.map((student) => (
                                    <tr
                                        key={student.user_id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-white">{student.full_name}</td>
                                        <td className="px-6 py-4 text-white/80">{student.usn || "—"}</td>
                                        <td className="px-6 py-4 text-white/80">{student.academic_year || "—"}</td>
                                        <td className="px-6 py-4 text-white/80">{student.branch || "—"}</td>
                                        <td className={`px-6 py-4 font-medium ${getTrendColor(student.learning_trend)}`}>
                                            {student.learning_trend}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm ${student.pending_doubts > 0
                                                    ? "bg-orange-500/20 text-orange-400"
                                                    : "bg-green-500/20 text-green-400"
                                                }`}>
                                                {student.pending_doubts} pending
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 ${getAttentionColor(student.attention_pattern)}`}>
                                            {student.attention_pattern}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => router.push(`/teacher/let/${student.user_id}`)}
                                                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-all text-sm font-medium"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
