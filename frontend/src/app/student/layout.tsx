"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, BookOpen, User as UserIcon, Trophy, Rocket, MessageCircleQuestion, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    React.useEffect(() => {
        if (!isLoading && (!user || user.role !== 'student')) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    const navItems = [
        { href: '/student/courses', label: 'My Learning', icon: BookOpen },
        { href: '/student/let', label: 'Learning Evidence', icon: TrendingUp },
        { href: '/student/exam-scheduler', label: 'Exam Scheduler', icon: Calendar },
        { href: '/student/doubts', label: 'Community Doubts', icon: MessageCircleQuestion },
        { href: '/student/achievements', label: 'Achievements', icon: Trophy },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <nav className="w-full md:w-20 lg:w-64 glass-panel m-4 flex flex-col p-4 h-fit md:h-[calc(100vh-2rem)] sticky top-4 transition-all">
                <div className="mb-8 px-2 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                        CT
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-lg font-bold text-white">CourseTwin</h2>
                        <p className="text-xs text-white/50">{user?.full_name}</p>
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                                    isActive ? "bg-white/10 text-white border border-white/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}>
                                    <Icon size={24} />
                                    <span className="hidden lg:block">{item.label}</span>
                                    {/* Tooltip for mobile/collapsed */}
                                    <div className="lg:hidden absolute left-full ml-4 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                        {item.label}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10">
                    <GlassCard className="p-3 mb-4 hidden lg:block bg-gradient-to-br from-primary/20 to-secondary/20 border-none">
                        <div className="flex items-center gap-2 mb-2">
                            <Rocket size={16} className="text-accent" />
                            <span className="text-xs font-bold text-white">Daily Streak</span>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`h-8 flex-1 rounded-md ${i <= 3 ? 'bg-accent' : 'bg-white/10'}`}></div>
                            ))}
                        </div>
                    </GlassCard>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full"
                    >
                        <LogOut size={24} />
                        <span className="hidden lg:block">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
