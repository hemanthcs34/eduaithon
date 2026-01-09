"use client";

import React, { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui/glass';
import { Upload, PlayCircle, Loader2, X, FileText, Trash2, Brain } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Video {
    id: number;
    title: string;
    url: string;
    order_index: number;
    primary_video_id?: number;
}

interface Material {
    id: number;
    title: string;
    file_type: string;
    created_at: string;
    content_text?: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
    videos: Video[];
}

export default function CourseDetailPage() {
    const { id } = useParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const alternateFileInputRef = useRef<HTMLInputElement>(null);
    const materialInputRef = useRef<HTMLInputElement>(null);
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [materialTitle, setMaterialTitle] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [selectedAlternateName, setSelectedAlternateName] = useState('');
    const [selectedMaterialName, setSelectedMaterialName] = useState('');
    const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
    const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);
    const [uploadingAlternateForId, setUploadingAlternateForId] = useState<number | null>(null);

    // Fetch course data and materials
    useEffect(() => {
        const fetchData = async () => {
            try {
                const courseRes = await api.get(`/courses/${id}`);
                setCourse(courseRes.data);

                const materialsRes = await api.get(`/courses/${id}/materials`);
                setMaterials(materialsRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setFetchLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleFileSelect = () => {
        if (fileInputRef.current?.files?.[0]) {
            setSelectedFileName(fileInputRef.current.files[0].name);
        }
    };

    const handleAlternateFileSelect = () => {
        if (alternateFileInputRef.current?.files?.[0]) {
            setSelectedAlternateName(alternateFileInputRef.current.files[0].name);
        }
    };

    const handleMaterialSelect = () => {
        if (materialInputRef.current?.files?.[0]) {
            setSelectedMaterialName(materialInputRef.current.files[0].name);
        }
    };

    const handleUploadVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileInputRef.current?.files?.[0]) {
            alert("Please select a video file");
            return;
        }

        setLoading(true);
        try {
            const file = fileInputRef.current.files[0];
            const formData = new FormData();
            formData.append('file', file);

            if (alternateFileInputRef.current?.files?.[0]) {
                formData.append('alternate_file', alternateFileInputRef.current.files[0]);
            }

            const orderIndex = (course?.videos?.filter(v => !v.primary_video_id).length || 0) + 1;

            await api.post(`/courses/${id}/videos?title=${encodeURIComponent(videoTitle)}&description=${encodeURIComponent(videoDescription)}&order_index=${orderIndex}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const res = await api.get(`/courses/${id}`);
            setCourse(res.data);
            setVideoTitle('');
            setVideoDescription('');
            setSelectedFileName('');
            setSelectedAlternateName('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (alternateFileInputRef.current) alternateFileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAlternate = async (primaryVideoId: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setUploadingAlternateForId(primaryVideoId);
            try {
                const formData = new FormData();
                formData.append('alternate_file', file);

                // For fallback upload, we pass primary_video_id and NO file/title/desc (backend inherits)
                await api.post(`/courses/${id}/videos?primary_video_id=${primaryVideoId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const res = await api.get(`/courses/${id}`);
                setCourse(res.data);
            } catch (err) {
                console.error(err);
                alert('Alternate upload failed');
            } finally {
                setUploadingAlternateForId(null);
            }
        };

        input.click();
    };

    const handleUploadMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!materialInputRef.current?.files?.[0]) {
            alert("Please select a material file");
            return;
        }

        setUploadingMaterial(true);
        try {
            const file = materialInputRef.current.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', materialTitle);

            await api.post(`/courses/${id}/materials`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const res = await api.get(`/courses/${id}/materials`);
            setMaterials(res.data);
            setMaterialTitle('');
            setSelectedMaterialName('');
            if (materialInputRef.current) materialInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            alert('Material upload failed');
        } finally {
            setUploadingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (materialId: number) => {
        if (!confirm('Delete this material?')) return;

        try {
            await api.delete(`/courses/${id}/materials/${materialId}`);
            setMaterials(materials.filter(m => m.id !== materialId));
        } catch (err) {
            console.error(err);
            alert('Failed to delete material');
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">{course?.title || 'Course Manager'}</h1>
                    <p className="text-white/50 mt-1">{course?.description}</p>
                </div>
                <Link href={`/teacher/courses/${id}/diagram-submissions`}>
                    <GlassButton className="flex items-center gap-2 bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30">
                        <Brain size={18} className="text-purple-400" />
                        <span className="text-purple-400">View Diagram Submissions</span>
                    </GlassButton>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Videos Section */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white">Videos ({course?.videos?.length || 0})</h2>

                    {course?.videos && course.videos.length > 0 ? (
                        <div className="space-y-3">
                            {course.videos
                                .filter(v => !v.primary_video_id) // Only show primary videos in main list
                                .sort((a, b) => a.order_index - b.order_index)
                                .map((video, index) => {
                                    const hasAlternate = course.videos.some(v => v.primary_video_id === video.id);

                                    return (
                                        <GlassCard
                                            key={video.id}
                                            className="flex items-center gap-4 p-4 hover:bg-white/10 transition-colors"
                                        >
                                            <div
                                                className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary cursor-pointer"
                                                onClick={() => setPreviewVideo(video)}
                                            >
                                                <PlayCircle size={20} />
                                            </div>
                                            <div className="flex-1 cursor-pointer" onClick={() => setPreviewVideo(video)}>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-white">{video.title}</p>
                                                    {hasAlternate && (
                                                        <span className="text-[10px] uppercase tracking-wider bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                                            Alternate Added
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-white/40">Video {index + 1} - Click to preview</p>
                                            </div>

                                            {/* Fallback Upload Button */}
                                            {!hasAlternate && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddAlternate(video.id);
                                                    }}
                                                    disabled={uploadingAlternateForId === video.id}
                                                    className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all flex items-center gap-2"
                                                >
                                                    {uploadingAlternateForId === video.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload size={12} />
                                                            Add Alternate
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm(`Delete "${video.title}"?`)) return;
                                                    try {
                                                        await api.delete(`/courses/${id}/videos/${video.id}`);
                                                        const res = await api.get(`/courses/${id}`);
                                                        setCourse(res.data);
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Failed to delete video');
                                                    }
                                                }}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </GlassCard>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-xl p-8 text-center border border-dashed border-white/10">
                            <p className="text-white/40">No videos yet</p>
                        </div>
                    )}

                    {/* Materials Section */}
                    <h2 className="text-xl font-bold text-white mt-8">Course Materials ({materials.length})</h2>
                    <p className="text-sm text-white/50">Upload PDFs, text files, or markdown for AI-powered chatbot and quizzes</p>

                    {materials.length > 0 ? (
                        <div className="space-y-3">
                            {materials.map((material) => (
                                <GlassCard key={material.id} className="flex items-center gap-4 p-4">
                                    <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-white">{material.title}</p>
                                        <p className="text-xs text-white/40">{material.file_type.toUpperCase()}</p>
                                    </div>
                                    <a
                                        href={`https://coursetwin-backend.onrender.com/api/v1/courses/${id}/materials/${material.id}/download`}
                                        download
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <Upload size={16} className="rotate-180" />
                                    </a>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(material.id); }}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </GlassCard>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-xl p-8 text-center border border-dashed border-white/10">
                            <p className="text-white/40">No materials uploaded. Add materials for AI-powered features!</p>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="space-y-6">
                    {/* Video Upload */}
                    <GlassCard>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <PlayCircle size={20} className="text-primary" />
                            Upload Video
                        </h3>
                        <form onSubmit={handleUploadVideo} className="space-y-4">
                            <GlassInput
                                placeholder="Video Title"
                                value={videoTitle}
                                onChange={e => setVideoTitle(e.target.value)}
                                required
                            />
                            <textarea
                                placeholder="Topic Description (e.g., 'Object Detection, YOLO, Bounding Boxes') - Used for AI Quiz Generation"
                                value={videoDescription}
                                onChange={e => setVideoDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                rows={3}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Primary Section */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/80">1. Primary Video (Compulsory)</label>
                                    <div
                                        className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl p-6 text-center hover:bg-primary/10 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect} />
                                        <Upload className="mx-auto h-6 w-6 text-primary mb-2" />
                                        <p className="text-sm font-medium text-white">{selectedFileName || 'Select Primary Video'}</p>
                                        <p className="text-xs text-white/40 mt-1">Required</p>
                                    </div>
                                </div>

                                {/* Alternate Section */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/80">2. Alternate Video (Optional)</label>
                                    <div
                                        className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => alternateFileInputRef.current?.click()}
                                    >
                                        <input type="file" ref={alternateFileInputRef} className="hidden" accept="video/*" onChange={handleAlternateFileSelect} />
                                        <Upload className="mx-auto h-6 w-6 text-white/40 mb-2" />
                                        <p className="text-sm font-medium text-white/80">{selectedAlternateName || 'Select Alternate Video'}</p>
                                        <p className="text-xs text-white/40 mt-1">Optional deep-dive or explanation</p>
                                    </div>
                                </div>
                            </div>
                            <GlassButton type="submit" disabled={loading} className="w-full">
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Upload Video'}
                            </GlassButton>
                        </form>
                    </GlassCard>

                    {/* Material Upload */}
                    <GlassCard>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-accent" />
                            Upload Material
                        </h3>
                        <form onSubmit={handleUploadMaterial} className="space-y-4">
                            <GlassInput
                                placeholder="Material Title"
                                value={materialTitle}
                                onChange={e => setMaterialTitle(e.target.value)}
                                required
                            />
                            <div
                                className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => materialInputRef.current?.click()}
                            >
                                <input type="file" ref={materialInputRef} className="hidden" accept=".pdf,.txt,.md" onChange={handleMaterialSelect} />
                                <FileText className="mx-auto h-6 w-6 text-white/40 mb-2" />
                                <p className="text-sm text-white/60">{selectedMaterialName || 'Select PDF/TXT/MD'}</p>
                            </div>
                            <GlassButton type="submit" disabled={uploadingMaterial} className="w-full">
                                {uploadingMaterial ? <Loader2 className="animate-spin mx-auto" /> : 'Upload Material'}
                            </GlassButton>
                        </form>
                    </GlassCard>
                </div>
            </div>

            {/* Video Preview Modal */}
            {previewVideo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}>
                    <div className="w-full max-w-4xl bg-[#0f172a] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-white/10">
                            <h3 className="font-bold text-white">{previewVideo.title}</h3>
                            <button onClick={() => setPreviewVideo(null)} className="text-white/60 hover:text-white"><X size={24} /></button>
                        </div>
                        <video src={`https://coursetwin-backend.onrender.com/api/v1/videos/${previewVideo.id}/stream`} controls autoPlay className="w-full aspect-video" />
                    </div>
                </div>
            )}

            {/* Material Preview Modal */}
            {previewMaterial && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewMaterial(null)}>
                    <div className="w-full max-w-3xl max-h-[80vh] bg-[#0f172a] rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-white">{previewMaterial.title}</h3>
                                <p className="text-xs text-accent">{previewMaterial.file_type.toUpperCase()} Document</p>
                            </div>
                            <button onClick={() => setPreviewMaterial(null)} className="text-white/60 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {previewMaterial.content_text ? (
                                <pre className="text-white/80 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {previewMaterial.content_text}
                                </pre>
                            ) : (
                                <p className="text-white/40 text-center py-8">No text content extracted from this file.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
