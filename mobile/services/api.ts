import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API - Production Render backend
const BASE_URL = 'https://coursetwin-backend.onrender.com/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth endpoints
export const authAPI = {
    login: async (email: string, password: string) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await axios.post(`${BASE_URL}/login/access-token`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    getMe: () => api.get('/users/me'),
};

// Course endpoints
export const courseAPI = {
    getMyCourses: () => api.get('/courses/browse'),
    getCourse: (id: number) => api.get(`/courses/${id}`),
    getCourseProgress: (id: number) => api.get(`/videos/course/${id}/progress`),
};

// LET endpoints
export const letAPI = {
    getDashboard: () => api.get('/let/student/dashboard'),
    logEvidence: (data: any) => api.post('/let/log', data),
};

// Exam Scheduler endpoints
export const schedulerAPI = {
    generate: (data: any) => api.post('/exam-scheduler/generate', data),
    getMySchedules: () => api.get('/exam-scheduler/my-schedules'),
};

// Vision Lab endpoints
export const visionAPI = {
    explore: async (imageUri: string) => {
        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'image.jpg',
        } as any);

        return axios.post(`${BASE_URL}/vision/explore`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Doubts endpoints
export const doubtsAPI = {
    getCourseDoubts: (courseId: number) => api.get(`/doubts/course/${courseId}`),
    createDoubt: (data: any) => api.post('/doubts', data),
};

export default api;
