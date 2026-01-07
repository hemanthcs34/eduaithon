"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui/glass';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    // Create Course Modal State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/courses/', { title, description });
            // Close modal and navigate to the new course
            setShowModal(false);
            setTitle('');
            setDescription('');
            router.push(`/teacher/courses/${res.data.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create course. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setTitle('');
        setDescription('');
    };

    useEffect(() => {
        api.get('/courses/').then(res => setCourses(res.data)).catch(err => console.error(err));
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">My Courses</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create New Card */}
                <button className="text-left" onClick={() => setShowModal(true)}>
                    <GlassCard className="h-48 flex flex-col items-center justify-center gap-4 group hover:bg-white/5 transition-colors border-dashed border-2 border-white/20">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <p className="font-bold text-white/60">Create New Course</p>
                    </GlassCard>
                </button>

                {courses.map((course) => (
                    <GlassCard
                        key={course.id}
                        className="h-48 flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => router.push(`/teacher/courses/${course.id}`)}
                    >
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                            <p className="text-sm text-white/50 line-clamp-2">{course.description}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/40">{course.videos?.length || 0} Videos</span>
                            <div className="flex gap-2">
                                <GlassButton
                                    className="px-4 py-2 text-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/teacher/courses/${course.id}`);
                                    }}
                                >
                                    Manage
                                </GlassButton>
                                <button
                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm(`Delete "${course.title}"? This will remove all videos, materials, and student progress.`)) return;
                                        try {
                                            await api.delete(`/courses/${course.id}`);
                                            setCourses(courses.filter(c => c.id !== course.id));
                                        } catch (err) {
                                            console.error(err);
                                            alert('Failed to delete course');
                                        }
                                    }}
                                    title="Delete Course"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Create Course Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <GlassCard className="w-full max-w-lg bg-[#0f172a]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-bold text-lg text-white mb-4">Create New Course</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <GlassInput
                                placeholder="Course Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                            <GlassInput
                                placeholder="Description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>
                                <GlassButton type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Create Course'}
                                </GlassButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
