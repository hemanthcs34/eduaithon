import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Stage {
    stage_name: string;
    stage_description: string;
    image_base64: string;
}

export default function VisionScreen() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [stages, setStages] = useState<Stage[]>([]);
    const [explanation, setExplanation] = useState<string>('');

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
            analyzeImage(result.assets[0].uri);
        }
    };

    const analyzeImage = async (uri: string) => {
        setLoading(true);
        setStages([]);
        setExplanation('');

        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                type: 'image/jpeg',
                name: 'image.jpg',
            } as any);

            // Replace with actual IP when testing
            const response = await fetch('http://172.22.66.123:8000/api/v1/vision/explore', {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.ok) {
                const data = await response.json();
                setStages(data.stages || []);
                setExplanation(data.final_explanation || '');
            }
        } catch (error) {
            console.error('Vision analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Visual Exploration Lab</Text>
                    <Text style={styles.subtitle}>Understand how CNNs process images</Text>
                </View>

                {/* Upload Area */}
                <TouchableOpacity style={styles.uploadArea} onPress={pickImage} activeOpacity={0.7}>
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    ) : (
                        <>
                            <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.uploadText}>Tap to select an image</Text>
                        </>
                    )}
                </TouchableOpacity>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                        <Text style={styles.loadingText}>Analyzing image layers...</Text>
                    </View>
                )}

                {/* Results */}
                {stages.map((stage, index) => (
                    <Animated.View key={index} entering={FadeIn.delay(index * 150)} style={styles.stageCard}>
                        <Text style={styles.stageName}>{stage.stage_name}</Text>
                        <Text style={styles.stageDescription}>{stage.stage_description}</Text>
                        <Image
                            source={{ uri: `data:image/png;base64,${stage.image_base64}` }}
                            style={styles.stageImage}
                            resizeMode="contain"
                        />
                    </Animated.View>
                ))}

                {explanation ? (
                    <View style={styles.explanationCard}>
                        <Text style={styles.explanationTitle}>Analysis Summary</Text>
                        <Text style={styles.explanationText}>{explanation}</Text>
                    </View>
                ) : null}
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

    uploadArea: {
        height: 200,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    previewImage: { width: '100%', height: '100%' },
    uploadText: { fontSize: 14, color: Colors.textMuted, marginTop: 12 },

    loadingContainer: { alignItems: 'center', paddingVertical: 30 },
    loadingText: { fontSize: 14, color: Colors.textMuted, marginTop: 12 },

    stageCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stageName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
    stageDescription: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
    stageImage: { width: '100%', height: 150, borderRadius: 8, backgroundColor: '#000' },

    explanationCard: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    explanationTitle: { fontSize: 16, fontWeight: '600', color: Colors.accent, marginBottom: 8 },
    explanationText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
