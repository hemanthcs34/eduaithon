"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui/glass';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const [error, setError] = useState('');

    const [role, setRole] = useState<'student' | 'teacher'>('student');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!isLogin) {
                // Sign Up - POST JSON to create user
                await api.post('/users/', {
                    email,
                    password,
                    full_name: email.split('@')[0],
                    role
                });
            }

            // Login - Always login after signup or direct login
            // OAuth2 requires application/x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const res = await api.post('/login/access-token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            login(res.data.access_token);
        } catch (err: any) {
            console.error(err);
            // Handle different error formats from FastAPI
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (Array.isArray(detail)) {
                // Validation errors are arrays of objects
                setError(detail.map((e: any) => e.msg).join(', '));
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent mb-2">
                        CourseTwin Lite
                    </h1>
                    <p className="text-white/60">Hard-personalized Learning</p>
                </div>

                <GlassCard>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        {isLogin ? 'Welcome Back' : 'Join the Elite'}
                    </h2>

                    {error && (
                        <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm border border-red-500/20 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/40" />
                            <GlassInput
                                placeholder="Email"
                                type="email"
                                className="pl-10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/40" />
                            <GlassInput
                                placeholder="Password"
                                type="password"
                                className="pl-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {!isLogin && (
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={`flex-1 py-2 rounded-xl border transition-all ${role === 'student' ? 'bg-primary border-primary text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('teacher')}
                                    className={`flex-1 py-2 rounded-xl border transition-all ${role === 'teacher' ? 'bg-secondary border-secondary text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                                >
                                    Teacher
                                </button>
                            </div>
                        )}

                        <GlassButton type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isLogin ? 'Login' : 'Sign Up')}
                        </GlassButton>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-white/60 hover:text-white transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                        </button>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
}
