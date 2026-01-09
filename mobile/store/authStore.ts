import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/services/api';

interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'teacher' | 'student';
}

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
        try {
            const tokenData = await authAPI.login(email, password);
            const token = tokenData.access_token;

            await AsyncStorage.setItem('token', token);
            set({ token });

            // Fetch user data
            const userResponse = await authAPI.getMe();
            set({
                user: userResponse.data,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem('token');
        set({
            token: null,
            user: null,
            isAuthenticated: false,
        });
    },

    checkAuth: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                set({ isLoading: false, isAuthenticated: false });
                return;
            }

            set({ token });
            const userResponse = await authAPI.getMe();
            set({
                user: userResponse.data,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            await AsyncStorage.removeItem('token');
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },
}));
