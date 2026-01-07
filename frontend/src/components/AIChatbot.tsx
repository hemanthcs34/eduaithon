"use client";

import React, { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui/glass';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatbotProps {
    courseId: number;
    className?: string;
}

export default function AIChatbot({ courseId, className = "" }: AIChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to chat
        const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const response = await api.post('/chat/', {
                course_id: courseId,
                message: userMessage,
                history: messages
            });

            setMessages([...newMessages, {
                role: 'assistant',
                content: response.data.response
            }]);
        } catch (err: any) {
            console.error(err);
            setMessages([...newMessages, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please make sure Ollama is running locally.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <GlassCard className={`flex flex-col h-full ${className}`}>
            <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Bot size={16} className="text-accent" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">AI Tutor</h3>
                    <p className="text-xs text-white/40">Ask questions about the course</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[200px] max-h-[400px]">
                {messages.length === 0 ? (
                    <div className="text-center text-white/30 text-sm py-8">
                        <Bot size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Ask me anything about the course materials!</p>
                        <p className="text-xs mt-2">I can help explain concepts, answer questions, and more.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                                    <Bot size={14} className="text-accent" />
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.role === 'user'
                                    ? 'bg-primary/20 text-white'
                                    : 'bg-white/5 text-white/90'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <User size={14} className="text-primary" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center">
                            <Loader2 size={14} className="text-accent animate-spin" />
                        </div>
                        <div className="bg-white/5 rounded-xl px-4 py-2">
                            <p className="text-sm text-white/60">Thinking...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="pt-4 border-t border-white/10">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent/50"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="h-10 w-10 rounded-xl bg-accent/20 hover:bg-accent/40 flex items-center justify-center text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
