import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { schedulerAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SchedulerScreen() {
    const [topics, setTopics] = useState<{ name: string, importance?: string }[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [examDate, setExamDate] = useState('');
    const [dailyHours, setDailyHours] = useState('4');
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<any>(null);

    const addTopic = () => {
        if (newTopic.trim()) {
            setTopics([...topics, { name: newTopic.trim() }]);
            setNewTopic('');
        }
    };

    const removeTopic = (index: number) => {
        setTopics(topics.filter((_, i) => i !== index));
    };

    const generateSchedule = async () => {
        if (topics.length === 0) {
            Alert.alert('Error', 'Please add at least one topic');
            return;
        }
        if (!examDate) {
            Alert.alert('Error', 'Please enter exam date (YYYY-MM-DD)');
            return;
        }

        setLoading(true);
        try {
            const response = await schedulerAPI.generate({
                exam_date: examDate,
                daily_hours: parseFloat(dailyHours),
                topics: topics.map(t => ({ topic_name: t.name, importance_level: t.importance })),
            });
            setSchedule(response.data);
        } catch (error: any) {
            console.error('Failed to generate schedule:', error);
            Alert.alert('Error', error?.response?.data?.detail || 'Failed to generate schedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Exam Scheduler</Text>
                    <Text style={styles.subtitle}>AI-optimized study plan</Text>
                </View>

                {/* Inputs */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Exam Date (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2026-02-15"
                        placeholderTextColor={Colors.textMuted}
                        value={examDate}
                        onChangeText={setExamDate}
                    />
                </View>

                <View style={styles.inputSection}>
                    <Text style={styles.label}>Daily Study Hours</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="4"
                        placeholderTextColor={Colors.textMuted}
                        value={dailyHours}
                        onChangeText={setDailyHours}
                        keyboardType="numeric"
                    />
                </View>

                {/* Topics Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Topics to Study</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Add a topic..."
                            placeholderTextColor={Colors.textMuted}
                            value={newTopic}
                            onChangeText={setNewTopic}
                            onSubmitEditing={addTopic}
                        />
                        <TouchableOpacity style={styles.addButton} onPress={addTopic}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.topicTags}>
                        {topics.map((topic, index) => (
                            <View key={index} style={styles.topicTag}>
                                <Text style={styles.topicText}>{topic.name}</Text>
                                <TouchableOpacity onPress={() => removeTopic(index)}>
                                    <Ionicons name="close" size={16} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                    style={styles.generateButton}
                    onPress={generateSchedule}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.generateText}>Generate Schedule</Text>
                    )}
                </TouchableOpacity>

                {/* Schedule Display */}
                {schedule && schedule.days && (
                    <>
                        <Text style={styles.sectionTitle}>Your Study Plan</Text>
                        {schedule.days.map((day: any, dayIndex: number) => (
                            <Animated.View
                                key={dayIndex}
                                entering={FadeInDown.delay(dayIndex * 100).duration(300)}
                                style={styles.dayCard}
                            >
                                <Text style={styles.dayTitle}>{day.date}</Text>
                                <Text style={styles.dayPhase}>{day.phase}</Text>
                                {day.tasks && day.tasks.map((task: any, taskIndex: number) => (
                                    <View key={taskIndex} style={styles.taskRow}>
                                        <View style={styles.taskIndicator} />
                                        <View style={styles.taskContent}>
                                            <Text style={styles.taskTopic}>{task.topic_name}</Text>
                                            <Text style={styles.taskMeta}>{task.hours}h · {task.activity_type}</Text>
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 20, paddingBottom: 100 },
    header: { marginTop: 50, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '600', color: Colors.text },
    subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },

    inputSection: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: 14,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inputRow: { flexDirection: 'row', gap: 10 },
    addButton: {
        width: 50,
        height: 50,
        backgroundColor: Colors.accent,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topicTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    topicTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    topicText: { fontSize: 13, color: Colors.text },

    generateButton: {
        backgroundColor: Colors.accent,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    generateText: { fontSize: 16, fontWeight: '600', color: '#fff' },

    sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },

    dayCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dayTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
    dayPhase: { fontSize: 12, color: Colors.accent, marginBottom: 12 },
    taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    taskIndicator: { width: 4, height: 30, borderRadius: 2, backgroundColor: Colors.accent, marginRight: 12 },
    taskContent: { flex: 1 },
    taskTopic: { fontSize: 14, fontWeight: '500', color: Colors.text },
    taskMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
