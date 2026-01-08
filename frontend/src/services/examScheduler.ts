import api from '@/lib/api';

export interface TopicInput {
    topic_name: string;
    importance_level?: 'high' | 'medium' | 'low';
    marks?: number;
}

export interface ExamScheduleCreate {
    exam_date: string; // ISO date string
    daily_hours: number;
    topics: TopicInput[];
}

export interface StudyTask {
    topic: string;
    activity_type: string;
    duration_hours: number;
    priority_score: number;
    importance_level: string;
    is_inferred: boolean;
    rationale: string;
}

export interface DaySchedule {
    date: string;
    phase: string;
    tasks: StudyTask[];
    total_hours: number;
}

export interface ScheduleResponse {
    days: DaySchedule[];
    total_study_hours: number;
    days_until_exam: number;
    topics_covered: number;
}

export const examSchedulerService = {
    /**
     * Generate exam study schedule
     */
    async generateSchedule(data: ExamScheduleCreate): Promise<ScheduleResponse> {
        const response = await api.post('/exam-scheduler/generate', data);
        return response.data;
    },

    /**
     * Get saved schedules (optional feature)
     */
    async getMySchedules(): Promise<any[]> {
        const response = await api.get('/exam-scheduler/my-schedules');
        return response.data;
    }
};
