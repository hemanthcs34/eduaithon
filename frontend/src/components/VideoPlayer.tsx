import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, Maximize } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    onEnded?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    poster?: string;
    className?: string;
}

export default function VideoPlayer({ src, onEnded, onTimeUpdate, poster, className }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Simple native controls for now, can be enhanced with custom UI later
    return (
        <div className={cn("relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl group", className)}>
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                controls
                poster={poster}
                onEnded={onEnded}
                onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
            />
        </div>
    );
}
