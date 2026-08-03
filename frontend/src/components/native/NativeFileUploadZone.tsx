'use client';

import { FileText, Upload, Camera } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobileWebView } from '@/hooks/use-is-mobile-webview';

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
 * File upload that works in Play Store WebView wrappers (not only Capacitor).
 * On mobile: visible native file inputs + camera capture (no hidden/programmatic click).
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
    const isMobile = useIsMobileWebView();
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

    const handleChange = (file: File | null) => {
        onSelect(file);
    };

    if (isMobile) {
        return (
            <div className="space-y-3">
                {selectedFile && (
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
                )}

                {uploading && (
                    <p className="text-sm text-center text-muted-foreground">Uploading...</p>
                )}

                {!uploading && (
                    <>
                        {showCameraOption && (
                            <label
                                htmlFor={cameraInputId}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/5 py-4 px-4 text-sm font-semibold text-primary cursor-pointer active:bg-primary/10"
                            >
                                <Camera className="h-5 w-5 shrink-0" />
                                Take photo of document
                                <input
                                    id={cameraInputId}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    disabled={disabled}
                                    className="hidden"
                                    onChange={(e) => {
                                        handleChange(e.target.files?.[0] ?? null);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        )}

                        <div className="space-y-1.5">
                            <label
                                htmlFor={fileInputId}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 px-4 text-sm font-medium text-slate-700 cursor-pointer active:bg-slate-50"
                            >
                                <Upload className="h-5 w-5 shrink-0" />
                                Choose PDF or image from phone
                            </label>
                            <input
                                id={fileInputId}
                                type="file"
                                accept={accept}
                                disabled={disabled}
                                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
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
        );
    }

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
    );
}
