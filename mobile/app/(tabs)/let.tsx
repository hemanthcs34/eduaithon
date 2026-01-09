import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { letAPI } from '@/services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface DashboardData {
    timeline: any[];
    graphs: {
        concept_clarity: any[];
        observation_accuracy: any[];
        focus_distraction: any[];
    };
    doubts: {
        total: number;
        resolved: number;
        pending: number;
    };
}

export default function LETScreen() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const response = await letAPI.getDashboard();
            setData(response.data);
        } catch (err: any) {
            console.error('Failed to load LET dashboard:', err);
            setError(err?.response?.data?.detail || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>Loading your learning data...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const stats = [
        { label: 'Total Doubts', value: data?.doubts.total || 0 },
        { label: 'Resolved', value: data?.doubts.resolved || 0 },
        { label: 'Pending', value: data?.doubts.pending || 0 },
    ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Learning Evidence Trail</Text>
                    <Text style={styles.subtitle}>Your study patterns and progress</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {stats.map((stat, index) => (
                        <Animated.View
                            key={stat.label}
                            entering={FadeInDown.delay(index * 100).duration(300)}
                            style={styles.statCard}
                        >
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </Animated.View>
                    ))}
                </View>

                {/* Timeline */}
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {data?.timeline && data.timeline.length > 0 ? (
                    data.timeline.slice(0, 10).map((item: any, index: number) => (
                        <Animated.View
                            key={index}
                            entering={FadeInDown.delay(300 + index * 50).duration(300)}
                            style={styles.timelineItem}
                        >
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineType}>{item.evidence_type}</Text>
                                <Text style={styles.timelineDesc} numberOfLines={2}>{item.description}</Text>
                                <Text style={styles.timelineTime}>
                                    {new Date(item.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </Animated.View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No learning activity yet</Text>
                        <Text style={styles.emptySubtext}>Complete lessons to see your progress</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 20, paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    loadingText: { color: Colors.textMuted, marginTop: 12 },
    errorText: { color: Colors.error, fontSize: 14 },

    header: { marginTop: 50, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '600', color: Colors.text },
    subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statValue: { fontSize: 24, fontWeight: '600', color: Colors.text },
    statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },

    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
        marginTop: 6,
        marginRight: 12,
    },
    timelineContent: { flex: 1 },
    timelineType: { fontSize: 12, color: Colors.accent, fontWeight: '600', textTransform: 'uppercase' },
    timelineDesc: { fontSize: 14, color: Colors.text, marginTop: 4, lineHeight: 20 },
    timelineTime: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },

    emptyCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: { fontSize: 16, color: Colors.text },
    emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
