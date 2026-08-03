'use client';

import { FileText, Upload, Camera } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

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
 * File picker that works in Android/iOS WebView (Capacitor).
 * Uses a full-area transparent input overlay — avoids programmatic .click() on hidden inputs.
 */
export function NativeFileUploadZone({
    accept = 'application/pdf,image/jpeg,image/png,image/*',
    disabled = false,
    uploading = false,
    selectedFile = null,
    onSelect,
    title = 'Tap to upload your document',
    hint = 'PDF, JPG, or PNG · Max 10MB',
    showCameraOption = false,
    tone = 'default',
}: NativeFileUploadZoneProps) {
    const fileInputId = useId().replace(/:/g, '');
    const cameraInputId = useId().replace(/:/g, '');

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

    return (
        <div className="space-y-2">
            <label
                htmlFor={fileInputId}
                className={cn(
                    'relative block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all overflow-hidden',
                    borderClass,
                    (disabled || uploading) && 'opacity-60 pointer-events-none'
                )}
            >
                <input
                    id={fileInputId}
                    type="file"
                    accept={accept}
                    disabled={disabled || uploading}
                    className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        onSelect(file);
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
                                Tap to change file
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

            {showCameraOption && !selectedFile && !uploading && (
                <label
                    htmlFor={cameraInputId}
                    className="relative flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                >
                    <input
                        id={cameraInputId}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            onSelect(file);
                            e.target.value = '';
                        }}
                    />
                    <Camera className="h-4 w-4" />
                    Take photo of document
                </label>
            )}
        </div>
    );
}
