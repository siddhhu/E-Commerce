'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MobileCameraCaptureProps = {
    open: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
};

/**
 * Opens the device camera via getUserMedia — works in many WebViews where
 * `<input type="file">` is blocked.
 */
export function MobileCameraCapture({ open, onClose, onCapture }: MobileCameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setReady(false);
    }, []);

    useEffect(() => {
        if (!open) {
            stopStream();
            setError(null);
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    setError('Camera is not available in this app. Use the file picker below instead.');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    await video.play();
                    setReady(true);
                }
            } catch {
                setError('Could not open camera. Allow camera permission, or use the file picker below.');
            }
        })();

        return () => {
            cancelled = true;
            stopStream();
        };
    }, [open, stopStream]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || !ready) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
                onClose();
            },
            'image/jpeg',
            0.9
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
            <div className="flex items-center justify-between px-4 py-3 text-white">
                <p className="text-sm font-medium">Photograph your document</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 hover:bg-white/10"
                    aria-label="Close camera"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="relative flex-1 bg-black">
                {error ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/90">
                        {error}
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="h-full w-full object-cover"
                    />
                )}
            </div>

            <div className="p-4 pb-8">
                {error ? (
                    <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                        Close
                    </Button>
                ) : (
                    <Button
                        type="button"
                        className="w-full gap-2 min-h-[52px] text-base"
                        onClick={handleCapture}
                        disabled={!ready}
                    >
                        <Camera className="h-5 w-5" />
                        Capture photo
                    </Button>
                )}
            </div>
        </div>
    );
}
