import api from "@/lib/api";

// Evidence Types
export type EvidenceType =
    | "vision_mcq"
    | "doubt_raised"
    | "doubt_resolved"
    | "distraction"
    | "focus_session"
    | "diagram_analysis";

// Evidence Logging
export interface EvidencePayload {
    course_id?: number;
    type: EvidenceType;
    summary: string;
    concept_clarity?: "low" | "medium" | "high";
    observation_accuracy?: number; // 0.0 to 1.0
    focus_minutes?: number;
    distraction_minutes?: number;
    details?: string; // JSON string
}

// Timeline Entry
export interface TimelineEntry {
    timestamp: string;
    summary: string;
    type: EvidenceType;
}

// Graph Data
export interface ConceptClarityTrend {
    dates: string[];
    clarity_levels: string[]; // "low", "medium", "high"
}

export interface ObservationAccuracyTrend {
    dates: string[];
    accuracy_scores: number[]; // 0.0 to 1.0
}

export interface FocusDistractionTrend {
    dates: string[];
    focus_minutes: number[];
    distraction_minutes: number[];
}

export interface DoubtResolutionFlow {
    total_doubts: number;
    resolved_doubts: number;
    pending_doubts: number;
}

// Dashboard Response
export interface StudentLETDashboard {
    timeline: TimelineEntry[];
    concept_clarity_trend: ConceptClarityTrend;
    observation_accuracy_trend: ObservationAccuracyTrend;
    focus_distraction_trend: FocusDistractionTrend;
    doubt_resolution: DoubtResolutionFlow;
}

// Teacher Overview
export interface StudentLETSummary {
    user_id: number;
    full_name: string;
    usn: string | null;
    academic_year: string | null;
    branch: string | null;
    learning_trend: string; // "Improving", "Stable", "Inconsistent"
    pending_doubts: number;
    attention_pattern: string; // "Stable", "Fatigue signs"
}

export interface TeacherLETOverview {
    students: StudentLETSummary[];
}

// LET Service
export const letService = {
    /**
     * Log a learning evidence entry
     */
    logEvidence: async (payload: EvidencePayload) => {
        const response = await api.post("/let/log", payload);
        return response.data;
    },

    /**
     * Get student's own LET dashboard
     */
    getStudentDashboard: async (): Promise<StudentLETDashboard> => {
        const response = await api.get<StudentLETDashboard>("/let/student/dashboard");
        return response.data;
    },

    /**
     * Get teacher overview of all students
     */
    getTeacherOverview: async (): Promise<TeacherLETOverview> => {
        const response = await api.get<TeacherLETOverview>("/let/teacher/overview");
        return response.data;
    },

    /**
     * Get detailed LET dashboard for a specific student (teacher view)
     */
    getTeacherStudentLET: async (studentId: number): Promise<StudentLETDashboard> => {
        const response = await api.get<StudentLETDashboard>(`/let/teacher/student/${studentId}`);
        return response.data;
    }
};
