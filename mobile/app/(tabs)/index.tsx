import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { courseAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Course {
  id: number;
  title: string;
  description: string;
  enrollment_status?: string;
}

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getMyCourses();
      // Filter to only enrolled courses
      const enrolledCourses = response.data.filter(
        (c: any) => c.enrollment_status === 'approved'
      );
      setCourses(enrolledCourses);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { icon: 'analytics-outline', title: 'Learning Evidence', subtitle: 'View your progress', route: '/(tabs)/let' },
    { icon: 'calendar-outline', title: 'Exam Scheduler', subtitle: 'Plan your study', route: '/(tabs)/scheduler' },
    { icon: 'eye-outline', title: 'Vision Lab', subtitle: 'Explore CNN layers', route: '/(tabs)/vision' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.full_name || 'Student'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* My Courses */}
        <Text style={styles.sectionTitle}>My Courses</Text>
        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : courses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No enrolled courses yet</Text>
            <Text style={styles.emptySubtext}>Enroll in courses via the web app</Text>
          </View>
        ) : (
          courses.map((course, index) => (
            <Animated.View key={course.id} entering={FadeInDown.delay(index * 100).duration(300)}>
              <TouchableOpacity style={styles.courseCard} activeOpacity={0.7}>
                <View style={styles.courseIcon}>
                  <Ionicons name="book" size={20} color={Colors.accent} />
                </View>
                <View style={styles.courseContent}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseDesc} numberOfLines={1}>{course.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        {/* Navigation */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Access</Text>
        {navItems.map((item, index) => (
          <Animated.View key={item.title} entering={FadeInDown.delay(200 + index * 100).duration(300)}>
            <TouchableOpacity
              style={styles.navCard}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.navIcon}>
                <Ionicons name={item.icon as any} size={22} color={Colors.accent} />
              </View>
              <View style={styles.navContent}>
                <Text style={styles.navTitle}>{item.title}</Text>
                <Text style={styles.navSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  greeting: { fontSize: 14, color: Colors.textMuted },
  username: { fontSize: 24, fontWeight: '600', color: Colors.text, marginTop: 2 },
  logoutBtn: { padding: 10 },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { fontSize: 16, color: Colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  courseContent: { flex: 1 },
  courseTitle: { fontSize: 15, fontWeight: '500', color: Colors.text },
  courseDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  navContent: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '500', color: Colors.text },
  navSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
