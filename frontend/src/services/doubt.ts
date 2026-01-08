import api from "@/lib/api";

export interface Doubt {
    id: number;
    student_id: number;
    course_id: number;
    question_text: string;
    teacher_reply?: string;
    status: "pending" | "answered";
    created_at: string;
    student_name?: string;
}

export interface Session {
    id: number;
    course_id: number;
    teacher_id: number;
    session_date: string;
    meeting_link: string;
}

export const doubtService = {
    createDoubt: async (course_id: number, question_text: string) => {
        const response = await api.post<Doubt>("/doubts/", {
            course_id,
            question_text,
        });
        return response.data;
    },

    getDoubts: async (course_id: number) => {
        const response = await api.get<Doubt[]>(`/doubts/course/${course_id}`);
        return response.data;
    },

    replyDoubt: async (doubt_id: number, teacher_reply: string) => {
        const response = await api.put<Doubt>(`/doubts/${doubt_id}/reply`, {
            teacher_reply,
            status: "answered", // Backend defaults, but explicit is fine
        });
        return response.data;
    },

    // LIVE SESSIONS
    scheduleSession: async (course_id: number, session_date: string, meeting_link: string) => {
        const response = await api.post<Session>("/doubts/session", {
            course_id,
            session_date,
            meeting_link
        });
        return response.data;
    },

    getSessions: async (course_id: number) => {
        const response = await api.get<Session[]>(`/doubts/session/course/${course_id}`);
        return response.data;
    }
};
