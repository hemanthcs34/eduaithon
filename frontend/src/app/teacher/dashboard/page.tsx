"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassButton } from '@/components/ui/glass';
import { Check, X, User as UserIcon, Loader2, RefreshCw } from 'lucide-react';

interface EnrollmentRequest {
    id: number;
    student_name: string;
    student_email: string;
    course_title: string;
    course_id: number;
    status: string;
    created_at: string;
}

export default function TeacherDashboard() {
    const [pendingEnrollments, setPendingEnrollments] = useState<EnrollmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        fetchPendingEnrollments();
    }, []);

    const fetchPendingEnrollments = async () => {
        try {
            const res = await api.get('/users/enrollments/pending');
            setPendingEnrollments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (enrollmentId: number) => {
        setProcessingId(enrollmentId);
        try {
            await api.put(`/users/enroll/${enrollmentId}`, { status: 'approved' });
            await fetchPendingEnrollments();
        } catch (err) {
            console.error(err);
            alert('Failed to approve enrollment');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (enrollmentId: number) => {
        setProcessingId(enrollmentId);
        try {
            await api.put(`/users/enroll/${enrollmentId}`, { status: 'rejected' });
            await fetchPendingEnrollments();
        } catch (err) {
            console.error(err);
            alert('Failed to reject enrollment');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <GlassButton onClick={fetchPendingEnrollments} className="flex items-center gap-2">
                    <RefreshCw size={16} /> Refresh
                </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="space-y-2">
                    <h3 className="text-white/60 text-sm uppercase font-bold">Total Students</h3>
                    <p className="text-4xl font-bold text-white">—</p>
                </GlassCard>
                <GlassCard className="space-y-2">
                    <h3 className="text-white/60 text-sm uppercase font-bold">Active Courses</h3>
                    <p className="text-4xl font-bold text-white">—</p>
                </GlassCard>
                <GlassCard className="space-y-2">
                    <h3 className="text-white/60 text-sm uppercase font-bold">Pending Requests</h3>
                    <p className="text-4xl font-bold text-accent">{pendingEnrollments.length}</p>
                </GlassCard>
            </div>

            <div>
                <h2 className="text-xl font-bold text-white mb-4">Pending Enrollments</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingEnrollments.length === 0 ? (
                            <GlassCard className="text-center py-8">
                                <p className="text-white/40">No pending enrollment requests</p>
                            </GlassCard>
                        ) : (
                            pendingEnrollments.map((req) => (
                                <GlassCard key={req.id} className="flex justify-between items-center flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                                            <UserIcon size={20} className="text-white/60" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{req.student_name}</p>
                                            <p className="text-xs text-white/40">{req.student_email}</p>
                                            <p className="text-sm text-white/50 mt-1">
                                                wants to join <span className="text-primary font-medium">{req.course_title}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <GlassButton
                                            onClick={() => handleApprove(req.id)}
                                            disabled={processingId === req.id}
                                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/20"
                                        >
                                            {processingId === req.id ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} className="inline mr-1" /> Approve</>}
                                        </GlassButton>
                                        <GlassButton
                                            onClick={() => handleReject(req.id)}
                                            disabled={processingId === req.id}
                                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border-red-500/20"
                                        >
                                            {processingId === req.id ? <Loader2 className="animate-spin" size={18} /> : <><X size={18} className="inline mr-1" /> Reject</>}
                                        </GlassButton>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
