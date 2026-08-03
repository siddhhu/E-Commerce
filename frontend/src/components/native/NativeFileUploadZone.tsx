'use client';

import { useState } from 'react';
import { FileText, Upload, Camera } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { MobileCameraCapture } from '@/components/native/MobileCameraCapture';
import { Button } from '@/components/ui/button';

type NativeFileUploadZoneProps = {
    accept?: string;
    disabled?: boolean;
    uploading?: boolean;
    selectedFile?: File | null;
    onSelect: (file: File | null) => void;
    title?: string;
    hint?: string;
    showCameraOption?: boolean;
    tone?: 'default' | 'success' | 'blue';
};

/**
 * Touch-first upload for Play Store WebView wrappers.
 * Uses visible native inputs + getUserMedia camera (no hidden/opacity-0 tricks).
 */
export function NativeFileUploadZone({
    accept = 'application/pdf,image/jpeg,image/png,image/*',
    disabled = false,
    uploading = false,
    selectedFile = null,
    onSelect,
    title = 'Tap to upload your document',
    hint = 'PDF, JPG, or PNG · Max 10MB',
    showCameraOption = true,
    tone = 'default',
}: NativeFileUploadZoneProps) {
    const [cameraOpen, setCameraOpen] = useState(false);
    const cameraInputId = useId().replace(/:/g, '');
    const fileInputId = useId().replace(/:/g, '');

    const borderClass =
        tone === 'success'
            ? selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-muted hover:border-green-400/60'
            : tone === 'blue'
              ? selectedFile
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-muted hover:border-blue-400/60'
              : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-muted hover:border-primary/50';

    const handleChange = (file: File | null) => {
        onSelect(file);
    };

    const selectedBanner = selectedFile ? (
        <div
            className={cn(
                'rounded-xl border-2 p-4 text-center',
                tone === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
            )}
        >
            <FileText
                className={cn(
                    'h-8 w-8 mx-auto mb-2',
                    tone === 'blue' ? 'text-blue-600' : 'text-green-600'
                )}
            />
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Ready to upload</p>
        </div>
    ) : null;

    return (
        <>
            {/* Touch / phone / WebView — always in DOM, shown via CSS (no JS detection delay) */}
            <div className="upload-touch-first space-y-3">
                {selectedBanner}

                {uploading ? (
                    <p className="text-sm text-center text-muted-foreground py-2">Uploading...</p>
                ) : (
                    <>
                        {showCameraOption && (
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="default"
                                    className="w-full gap-2 min-h-[52px] text-base touch-manipulation"
                                    disabled={disabled}
                                    onClick={() => setCameraOpen(true)}
                                >
                                    <Camera className="h-5 w-5 shrink-0" />
                                    Open camera to photograph document
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    Or use one of the options below
                                </p>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="text-xs font-medium text-slate-700 mb-2">
                                        Take photo (native camera app)
                                    </p>
                                    <input
                                        id={cameraInputId}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        disabled={disabled}
                                        className="block w-full min-h-[48px] text-base text-slate-800 touch-manipulation cursor-pointer"
                                        onChange={(e) => {
                                            handleChange(e.target.files?.[0] ?? null);
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
                            <p className="text-xs font-medium text-slate-700">
                                Choose PDF or image from your phone
                            </p>
                            <input
                                id={fileInputId}
                                type="file"
                                accept={accept}
                                disabled={disabled}
                                className="block w-full min-h-[48px] text-base text-slate-800 touch-manipulation cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white"
                                onChange={(e) => {
                                    handleChange(e.target.files?.[0] ?? null);
                                    e.target.value = '';
                                }}
                            />
                        </div>

                        <p className="text-xs text-center text-muted-foreground">{hint}</p>
                    </>
                )}
            </div>

            {/* Desktop drag zone */}
            <div className="upload-desktop-only space-y-2">
                <label
                    htmlFor={`desktop-${fileInputId}`}
                    className={cn(
                        'relative block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all overflow-hidden',
                        borderClass,
                        (disabled || uploading) && 'opacity-60 pointer-events-none'
                    )}
                >
                    <input
                        id={`desktop-${fileInputId}`}
                        type="file"
                        accept={accept}
                        disabled={disabled || uploading}
                        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                        onChange={(e) => {
                            handleChange(e.target.files?.[0] ?? null);
                            e.target.value = '';
                        }}
                    />
                    <div className="relative z-10 pointer-events-none">
                        {uploading ? (
                            <p className="text-sm text-muted-foreground">Uploading...</p>
                        ) : selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileText
                                    className={cn(
                                        'h-8 w-8',
                                        tone === 'blue' ? 'text-blue-600' : 'text-green-600'
                                    )}
                                />
                                <p
                                    className={cn(
                                        'font-medium text-sm',
                                        tone === 'blue' ? 'text-blue-700' : 'text-green-700'
                                    )}
                                >
                                    {selectedFile.name}
                                </p>
                                <p
                                    className={cn(
                                        'text-xs',
                                        tone === 'blue' ? 'text-blue-600' : 'text-green-600'
                                    )}
                                >
                                    Click to change file
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm font-medium">{title}</p>
                                <p className="text-xs text-muted-foreground">{hint}</p>
                            </div>
                        )}
                    </div>
                </label>
            </div>

            <MobileCameraCapture
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(file) => handleChange(file)}
            />
        </>
    );
}
