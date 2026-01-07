"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui/glass';
import { Search, Play, User, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Teacher {
    id: number;
    full_name: string;
    email: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
    videos: any[];
    teacher: Teacher | null;
    is_enrolled: boolean;
    enrollment_status: string | null;
}

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses/browse');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
            // Fallback to regular courses endpoint
            const res = await api.get('/courses/');
            setCourses(res.data.map((c: any) => ({ ...c, teacher: null, is_enrolled: false, enrollment_status: null })));
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (courseId: number) => {
        setEnrollingId(courseId);
        try {
            await api.post('/users/enroll', { course_id: courseId });
            // Refresh courses to update enrollment status
            await fetchCourses();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to enroll');
        } finally {
            setEnrollingId(null);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-white">Explore Courses</h1>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                    <GlassInput
                        placeholder="Search courses..."
                        className="pl-10 py-2 text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                    <GlassCard key={course.id} className="flex flex-col justify-between group hover:border-accent/50 transition-all">
                        {/* Cover */}
                        <div className="h-32 -mx-6 -mt-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-4 flex items-center justify-center group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all relative">
                            <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                                <Play className="ml-1 text-white" size={20} />
                            </div>
                            {course.is_enrolled && (
                                <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <CheckCircle size={12} /> Enrolled
                                </div>
                            )}
                            {course.enrollment_status === 'pending' && (
                                <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Clock size={12} /> Pending
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-white mb-1">{course.title}</h3>
                            <p className="text-sm text-white/50 line-clamp-2 mb-3">{course.description}</p>

                            {/* Teacher Info */}
                            {course.teacher && (
                                <div className="flex items-center gap-2 mb-3 p-2 bg-white/5 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <User size={14} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-white">{course.teacher.full_name}</p>
                                        <p className="text-xs text-white/40">Instructor</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                                <span>{course.videos?.length || 0} videos</span>
                            </div>
                        </div>

                        {/* Actions */}
                        {course.is_enrolled ? (
                            <GlassButton
                                onClick={() => router.push(`/student/courses/${course.id}`)}
                                className="w-full py-2 text-sm bg-primary/20 hover:bg-primary border-primary/50"
                            >
                                Continue Learning
                            </GlassButton>
                        ) : course.enrollment_status === 'pending' ? (
                            <GlassButton
                                disabled
                                className="w-full py-2 text-sm bg-yellow-500/10 border-yellow-500/30 text-yellow-400 cursor-not-allowed"
                            >
                                Awaiting Approval
                            </GlassButton>
                        ) : course.enrollment_status === 'rejected' ? (
                            <GlassButton
                                disabled
                                className="w-full py-2 text-sm bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed"
                            >
                                Request Rejected
                            </GlassButton>
                        ) : (
                            <GlassButton
                                onClick={() => handleEnroll(course.id)}
                                disabled={enrollingId === course.id}
                                className="w-full py-2 text-sm bg-white/5 hover:bg-accent hover:border-accent border-white/10"
                            >
                                {enrollingId === course.id ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Request Enrollment'}
                            </GlassButton>
                        )}
                    </GlassCard>
                ))}
            </div>

            {filteredCourses.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-white/40">No courses found. Try a different search term.</p>
                </div>
            )}
        </div>
    );
}
