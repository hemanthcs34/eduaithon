"use client";

import React, { useState } from 'react';
import { Calendar, Clock, TrendingUp, Plus, X, CheckCircle2, Info, Bell, BellRing, BookOpen, PenTool, Swords } from 'lucide-react';
import { examSchedulerService, TopicInput, ScheduleResponse } from '@/services/examScheduler';

export default function ExamSchedulerPage() {
    // Form state
    const [examDate, setExamDate] = useState('');
    const [dailyHours, setDailyHours] = useState(4);
    const [topics, setTopics] = useState<TopicInput[]>([{ topic_name: '', importance_level: undefined }]);

    // Schedule state
    const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reminder state
    const [reminderTime, setReminderTime] = useState('');
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState('default');

    // Alarm Mode State
    const [alarmMode, setAlarmMode] = useState(false);
    interface TimeSlot {
        id: string;
        start: string;
        end: string;
        assignedTask?: string; // Topic name
    }
    const [dailySlots, setDailySlots] = useState<TimeSlot[]>([]);

    // Progress tracking (localStorage)
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

    // Load completed tasks from localStorage on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('exam_progress');
        if (saved) {
            setCompletedTasks(new Set(JSON.parse(saved)));
        }
    }, []);

    // Save completed tasks to localStorage
    const toggleTask = (taskKey: string) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(taskKey)) {
            newCompleted.delete(taskKey);
        } else {
            newCompleted.add(taskKey);
        }
        setCompletedTasks(newCompleted);
        localStorage.setItem('exam_progress', JSON.stringify([...newCompleted]));
    };

    const addTopic = () => {
        setTopics([...topics, { topic_name: '', importance_level: undefined }]);
    };

    const removeTopic = (index: number) => {
        setTopics(topics.filter((_, i) => i !== index));
    };

    const updateTopic = (index: number, field: keyof TopicInput, value: any) => {
        const newTopics = [...topics];
        newTopics[index] = { ...newTopics[index], [field]: value };
        setTopics(newTopics);
    };

    const handleGenerate = async () => {
        // Validation
        if (!examDate) {
            setError('Please select an exam date');
            return;
        }

        const validTopics = topics.filter(t => t.topic_name.trim());
        if (validTopics.length === 0) {
            setError('Please add at least one topic');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const scheduleData = await examSchedulerService.generateSchedule({
                exam_date: examDate,
                daily_hours: dailyHours,
                topics: validTopics
            });
            setSchedule(scheduleData);
            setCompletedTasks(new Set()); // Reset progress for new schedule
            localStorage.removeItem('exam_progress');
        } catch (err: any) {
            console.error('Failed to generate schedule:', err);
            setError(err.response?.data?.detail || 'Failed to generate schedule');
        } finally {
            setLoading(false);
        }
    };

    const getImportanceColor = (level: string) => {
        switch (level) {
            case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    // Load reminder settings
    React.useEffect(() => {
        const savedReminder = localStorage.getItem('exam_reminder_time');
        if (savedReminder) {
            setReminderTime(savedReminder);
            setReminderEnabled(true);
        }
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Alarm & Reminder Logic
    React.useEffect(() => {
        if ((!reminderEnabled || !reminderTime) && (!alarmMode || dailySlots.length === 0)) return;

        const checkTime = () => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const seconds = now.getSeconds();

            if (seconds < 2) {
                // 1. Global Daily Reminder
                if (reminderEnabled && reminderTime === currentTime) {
                    if (Notification.permission === 'granted') {
                        new Notification("Daily Study Reminder 📅", {
                            body: "Check your plan for the day!",
                        });
                    }
                }

                // 2. Alarm Mode Slot Alerts
                if (alarmMode) {
                    dailySlots.forEach(slot => {
                        if (slot.start === currentTime) {
                            const taskMsg = slot.assignedTask ? `Topic: ${slot.assignedTask}` : "Time to focus!";
                            if (Notification.permission === 'granted') {
                                new Notification(`Start Slot: ${slot.start} ⏰`, {
                                    body: taskMsg,
                                });
                            } else {
                                alert(`ALARM: ${slot.start}\n${taskMsg}`);
                            }
                        }
                    });
                }
            }
        };

        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [reminderEnabled, reminderTime, alarmMode, dailySlots]);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notifications");
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
    };

    const toggleReminder = () => {
        if (!reminderEnabled && notificationPermission !== 'granted') {
            requestNotificationPermission();
        }
        setReminderEnabled(!reminderEnabled);
    };

    // Slot Management
    const addSlot = () => {
        const id = Date.now().toString();
        // Default next hour
        const now = new Date();
        const start = `${String(now.getHours() + 1).padStart(2, '0')}:00`;
        const end = `${String(now.getHours() + 2).padStart(2, '0')}:00`;

        setDailySlots([...dailySlots, { id, start, end }]);
    };

    const removeSlot = (id: string) => {
        setDailySlots(dailySlots.filter(s => s.id !== id));
    };

    const updateSlot = (id: string, field: 'start' | 'end', value: string) => {
        setDailySlots(dailySlots.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    // Auto-distribute function needs schedule to be accessible
    const distributeTasksToSlots = (tasks: { topic: string }[] | undefined) => {
        if (!tasks || tasks.length === 0) return;

        const newSlots = [...dailySlots];
        let taskIdx = 0;

        newSlots.forEach((slot, i) => {
            if (taskIdx < tasks.length) {
                newSlots[i].assignedTask = tasks[taskIdx].topic;
                taskIdx++; // Simple round-robin or sequential fill
            } else {
                newSlots[i].assignedTask = undefined;
            }
        });
        setDailySlots(newSlots);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReminderTime(e.target.value);
        if (reminderEnabled) {
            localStorage.setItem('exam_reminder_time', e.target.value);
        }
    };

    const getActivityIcon = (type: string) => {
        if (!type) return <BookOpen size={14} className="text-blue-400" />;
        if (type.includes('Concept') || type.includes('Deep')) return <BookOpen size={14} className="text-blue-400" />;
        if (type.includes('Practice')) return <PenTool size={14} className="text-yellow-400" />;
        if (type.includes('Mock') || type.includes('Revision')) return <Swords size={14} className="text-red-400" />;
        return <Clock size={14} className="text-gray-400" />;
    };

    const getActivityColor = (type: string) => {
        if (!type) return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
        if (type.includes('Concept') || type.includes('Deep')) return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
        if (type.includes('Practice')) return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
        if (type.includes('Mock') || type.includes('Revision')) return 'text-red-300 bg-red-500/10 border-red-500/20';
        return 'text-white/60 bg-white/5 border-white/10';
    };

    const completionPercentage = schedule
        ? (completedTasks.size / schedule.days.reduce((sum, day) => sum + day.tasks.length, 0)) * 100
        : 0;

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-8 h-8 text-purple-400" />
                    <h1 className="text-3xl font-bold text-white">Exam Study Scheduler</h1>
                </div>
                <p className="text-white/60">
                    Adaptive plan based on your content mastery
                </p>
            </div>

            {!schedule ? (
                /* Input Form (Normal Generation) */
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Exam Date */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                Exam Date
                            </label>
                            <input
                                type="date"
                                value={examDate}
                                onChange={(e) => setExamDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-white/90 border border-white/20 rounded-lg text-gray-900 focus:border-purple-500 focus:outline-none"
                            />
                        </div>

                        {/* Daily Hours */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                Daily Study Hours: {dailyHours}h
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                value={dailyHours}
                                onChange={(e) => setDailyHours(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-white/40 mt-1">
                                <span>1h</span>
                                <span>12h</span>
                            </div>
                        </div>
                    </div>

                    {/* Topics */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-white font-medium">Exam Topics</label>
                            <button
                                onClick={addTopic}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm transition-colors"
                            >
                                <Plus size={16} />
                                Add Topic
                            </button>
                        </div>

                        <div className="space-y-3">
                            {topics.map((topic, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <input
                                        type="text"
                                        placeholder="Topic name (e.g., Data Structures)"
                                        value={topic.topic_name}
                                        onChange={(e) => updateTopic(index, 'topic_name', e.target.value)}
                                        className="flex-1 px-4 py-3 bg-white/90 border border-white/20 rounded-lg text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                    />

                                    <select
                                        value={topic.importance_level || ''}
                                        onChange={(e) => updateTopic(index, 'importance_level', e.target.value || undefined)}
                                        className="px-4 py-3 bg-white/90 border border-white/20 rounded-lg text-gray-900 focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="">Auto (from LET)</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>

                                    {topics.length > 1 && (
                                        <button
                                            onClick={() => removeTopic(index)}
                                            className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex items-start gap-2 text-sm text-white/60 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-400" />
                            <p>
                                Leave importance as "Auto" to let the system analyze your learning evidence and suggest priority levels
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-semibold disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Generating Schedule...' : 'Generate Study Plan'}
                    </button>
                </div>
            ) : (
                /* Schedule Display */
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <div className="text-white/60 text-sm">Days Until Exam</div>
                            <div className="text-3xl font-bold text-white">{schedule.days_until_exam}</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <div className="text-white/60 text-sm">Total Study Hours</div>
                            <div className="text-3xl font-bold text-white">{schedule.total_study_hours}h</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <div className="text-white/60 text-sm">Topics Covered</div>
                            <div className="text-3xl font-bold text-white">{schedule.topics_covered}</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <div className="text-white/60 text-sm">Progress</div>
                            <div className="text-3xl font-bold text-white">{completionPercentage.toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* Alarm Mode Panel */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${alarmMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'}`}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Detailed Daily Plan (Alarm Mode)</h3>
                                    <p className="text-white/60 text-sm">Define generic Study Slots for today and get alerts at start time.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <span className="mr-3 text-sm font-medium text-white">Enable Alarm Mode</span>
                                <input type="checkbox" checked={alarmMode} onChange={() => setAlarmMode(!alarmMode)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {alarmMode && (
                            <div className="bg-black/20 rounded-xl p-4 border border-white/10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-white font-medium">Today's Study Slots</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => distributeTasksToSlots(schedule.days[0]?.tasks)} className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded hover:bg-blue-500/30">
                                            Auto-Assign Today's Tasks
                                        </button>
                                        <button onClick={addSlot} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 flex items-center gap-1">
                                            <Plus size={12} /> Add Slot
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {dailySlots.map((slot, i) => (
                                        <div key={slot.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <input type="time" value={slot.start} onChange={(e) => updateSlot(slot.id, 'start', e.target.value)} className="bg-white/90 rounded px-1 text-gray-900 text-sm font-mono focus:outline-none" />
                                                <span className="text-white/20 text-xs text-center">to</span>
                                                <input type="time" value={slot.end} onChange={(e) => updateSlot(slot.id, 'end', e.target.value)} className="bg-white/90 rounded px-1 text-gray-900 text-sm font-mono focus:outline-none" />
                                            </div>
                                            <div className="flex-1 border-l border-white/10 pl-3">
                                                <div className="text-xs text-white/40 mb-1">Activity</div>
                                                <div className="text-sm text-white truncate font-medium">
                                                    {slot.assignedTask || "Free Study"}
                                                </div>
                                                <div className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                                                    <Bell size={10} /> Alarm: {slot.start}
                                                </div>
                                            </div>
                                            <button onClick={() => removeSlot(slot.id)} className="text-white/20 hover:text-red-400">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {dailySlots.length === 0 && (
                                        <div className="col-span-full text-center py-4 text-white/40 text-sm italic">
                                            No slots added. Add slots to activate alarms.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar Component (Existing) */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">Overall Progress</span>
                            <span className="text-white/60 text-sm">
                                {completedTasks.size} / {schedule.days.reduce((sum, day) => sum + day.tasks.length, 0)} tasks
                            </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Day-wise Schedule */}
                    <div className="space-y-4">
                        {schedule.days.map((day, dayIndex) => {
                            const dayDate = new Date(day.date);
                            const dayTasks = day.tasks.length;
                            const dayCompleted = day.tasks.filter(task =>
                                completedTasks.has(`${day.date}-${task.topic}`)
                            ).length;

                            return (
                                <div key={dayIndex} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                                <Calendar className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">
                                                    {dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-white/60 text-sm flex items-center gap-2">
                                                        <Clock size={14} />
                                                        {day.total_hours}h total
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded border ${day.phase === 'Deep Learning' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                                                        day.phase === 'Review & Practice' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' :
                                                            'bg-red-500/20 border-red-500/30 text-red-300'
                                                        }`}>
                                                        {day.phase}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-white/60">
                                                {dayCompleted} / {dayTasks} completed
                                            </div>
                                            <div className="text-xs text-green-400">
                                                {dayTasks > 0 ? Math.round((dayCompleted / dayTasks) * 100) : 0}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {day.tasks.map((task, taskIndex) => {
                                            const taskKey = `${day.date}-${task.topic}`;
                                            const isCompleted = completedTasks.has(taskKey);

                                            return (
                                                <div
                                                    key={taskIndex}
                                                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${isCompleted
                                                        ? 'bg-green-500/10 border-green-500/30'
                                                        : 'bg-white/5 border-white/10'
                                                        }`}
                                                >
                                                    <button
                                                        onClick={() => toggleTask(taskKey)}
                                                        className={`flex-shrink-0 mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isCompleted
                                                            ? 'border-green-500 bg-green-500'
                                                            : 'border-white/30 hover:border-white/60'
                                                            }`}
                                                    >
                                                        {isCompleted && <CheckCircle2 size={16} className="text-white" />}
                                                    </button>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <h4 className={`font-semibold ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                                                                {task.topic}
                                                            </h4>

                                                            {/* Activity Type Badge */}
                                                            <span className={`px-2 py-0.5 rounded text-xs border flex items-center gap-1.5 ${getActivityColor(task.activity_type)}`}>
                                                                {getActivityIcon(task.activity_type)}
                                                                {task.activity_type}
                                                            </span>

                                                            <span className={`px-2 py-1 rounded text-xs border ${getImportanceColor(task.importance_level)}`}>
                                                                {task.importance_level}
                                                                {task.is_inferred && ' (auto)'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-white/40 mb-1">
                                                            <span>{task.duration_hours} hours</span>
                                                        </div>
                                                        <p className="text-white/60 text-sm flex items-start gap-2">
                                                            <TrendingUp size={14} className="flex-shrink-0 mt-0.5" />
                                                            {task.rationale}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Regenerate Button */}
                    <button
                        onClick={() => setSchedule(null)}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                    >
                        Create New Schedule
                    </button>
                </div>
            )}
        </div>
    );
}
