'use client';

import { FileText, Upload } from 'lucide-react';
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
 * Phone and WebView upload.
 * The control the user taps is a real file input, so Android opens the
 * system camera or file picker. An in-page camera (getUserMedia) is not used:
 * Play Store WebViews block it and only show a permission error.
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
            <div className="upload-touch-first space-y-3">
                {selectedBanner}

                {uploading ? (
                    <p className="text-sm text-center text-muted-foreground py-2">Uploading...</p>
                ) : (
                    <>
                        {showCameraOption && (
                            <div className={cn('rounded-xl border border-slate-200 bg-white px-3 py-3', disabled && 'pointer-events-none opacity-60')}>
                                <p className="text-sm font-semibold text-slate-900 mb-2">Take photo with camera</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    disabled={disabled}
                                    className="pranjay-visible-file"
                                    onChange={(e) => {
                                        handleChange(e.target.files?.[0] ?? null);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        )}

                        <div className={cn('rounded-xl border border-slate-200 bg-white px-3 py-3', disabled && 'pointer-events-none opacity-60')}>
                            <p className="text-sm font-semibold text-slate-900 mb-2">Choose PDF or image</p>
                            <input
                                id={fileInputId}
                                type="file"
                                accept={accept}
                                disabled={disabled}
                                className="pranjay-visible-file"
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
        </>
    );
}
