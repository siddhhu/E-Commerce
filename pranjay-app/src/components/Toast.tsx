import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/src/theme/colors';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    text: string;
    kind: ToastKind;
}

interface ToastApi {
    show: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState<ToastMessage | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback(
        (text: string, kind: ToastKind = 'success') => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            setMessage({ id: Date.now(), text, kind });
            opacity.stopAnimation();
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, friction: 9 }).start();

            hideTimer.current = setTimeout(() => {
                Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                    if (finished) setMessage(null);
                });
            }, 2800);
        },
        [opacity]
    );

    const api = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            {message ? (
                <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
                    <View
                        style={[
                            styles.toast,
                            message.kind === 'error' && styles.error,
                            message.kind === 'info' && styles.info,
                        ]}
                    >
                        <Text style={styles.icon}>
                            {message.kind === 'success' ? '✓' : message.kind === 'error' ? '!' : 'i'}
                        </Text>
                        <Text style={styles.text} numberOfLines={2}>
                            {message.text}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}
        </ToastContext.Provider>
    );
}

export function DismissibleHint({ text, onPress }: { text: string; onPress?: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.hint}>
            <Text style={styles.hintText}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 96,
        alignItems: 'center',
        zIndex: 999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        maxWidth: '100%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: '#123B2C',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    error: { backgroundColor: '#7F1D1D' },
    info: { backgroundColor: '#1E293B' },
    icon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        textAlign: 'center',
        textAlignVertical: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.18)',
        color: '#fff',
        fontWeight: '900',
        fontSize: 12,
    },
    text: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
    hint: {
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    hintText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
