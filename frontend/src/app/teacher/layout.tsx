"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass';
import { LogOut, BookOpen, Users, LayoutDashboard, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    React.useEffect(() => {
        if (!isLoading && (!user || user.role !== 'teacher')) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    const navItems = [
        { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/teacher/courses', label: 'My Courses', icon: BookOpen },
        { href: '/teacher/doubts', label: 'Student Doubts', icon: MessageCircleQuestion },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <nav className="w-full md:w-64 glass-panel m-4 flex flex-col p-4 h-fit md:h-[calc(100vh-2rem)] sticky top-4">
                <div className="mb-8 px-2">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Instructor Hub
                    </h2>
                    <p className="text-sm text-white/50 truncate">{user?.full_name}</p>
                </div>

                <div className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    isActive ? "bg-primary/20 text-primary border border-primary/20" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}>
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 mt-auto rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </nav>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
