import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/src/theme/colors';

const LOADING_QUIPS = [
    'Fluffing the foundation cushions…',
    'Counting 1,766 lipsticks. Twice…',
    'Telling the mascara to behave…',
    'Polishing every serum bottle…',
    'Negotiating with the hair dryer…',
    'Stacking blush palettes neatly…',
    'Waking up the warehouse chai…',
    'Untangling the eyeliner queue…',
    'Sprinkling glitter, carefully…',
    'Asking the perfume to calm down…',
    'Folding 4,000 shampoo caps…',
    'Teaching the combs some manners…',
];

/** Playful rotating status text — shown under spinners so waits feel shorter. */
export function FunnyLoader({
    label,
    compact,
}: {
    label?: string;
    compact?: boolean;
}) {
    const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_QUIPS.length));

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((current) => (current + 1) % LOADING_QUIPS.length);
        }, 2600);
        return () => clearInterval(timer);
    }, []);

    return (
        <View style={compact ? styles.funnyCompact : styles.funny}>
            <View style={styles.funnyRow}>
                <ActivityIndicator color={colors.primary} />
                {label ? <Text style={styles.funnyLabel}>{label}</Text> : null}
            </View>
            <Text style={styles.funnyQuip}>{LOADING_QUIPS[index]}</Text>
        </View>
    );
}

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'dark';

export function PrimaryButton({
    label,
    onPress,
    loading,
    disabled,
    variant = 'primary',
}: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: ButtonVariant;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.btn,
                variant === 'outline' && styles.outline,
                variant === 'ghost' && styles.ghost,
                variant === 'dark' && styles.dark,
                (disabled || loading) && styles.btnDisabled,
                pressed && !disabled && !loading && styles.btnPressed,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
            ) : (
                <Text
                    style={[
                        styles.btnText,
                        (variant === 'outline' || variant === 'ghost') && styles.btnTextOutline,
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

export function ScreenHeader({
    title,
    subtitle,
    right,
    safe,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    safe?: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, safe && { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
                </View>
                {right}
            </View>
        </View>
    );
}

export function SectionHeader({
    title,
    action,
    onAction,
}: {
    title: string;
    action?: string;
    onAction?: () => void;
}) {
    return (
        <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {action ? (
                <Pressable onPress={onAction} hitSlop={8}>
                    <Text style={styles.sectionAction}>{action}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
    label,
    tone = 'neutral',
}: {
    label: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
}) {
    return (
        <View
            style={[
                styles.badge,
                tone === 'success' && styles.badgeSuccess,
                tone === 'warning' && styles.badgeWarning,
                tone === 'danger' && styles.badgeDanger,
                tone === 'primary' && styles.badgePrimary,
            ]}
        >
            <Text
                style={[
                    styles.badgeText,
                    tone === 'success' && styles.badgeTextSuccess,
                    tone === 'warning' && styles.badgeTextWarning,
                    tone === 'danger' && styles.badgeTextDanger,
                    tone === 'primary' && styles.badgeTextPrimary,
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

export function Chip({
    label,
    active,
    onPress,
}: {
    label: string;
    active?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </Pressable>
    );
}

export function EmptyState({
    title,
    message,
    actionLabel,
    onAction,
}: {
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <View style={styles.empty}>
            <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>P</Text>
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
            {actionLabel && onAction ? (
                <View style={styles.emptyAction}>
                    <PrimaryButton label={actionLabel} onPress={onAction} />
                </View>
            ) : null}
        </View>
    );
}

export function LoadingScreen({ label }: { label?: string }) {
    return (
        <View style={styles.loading}>
            <FunnyLoader label={label} />
        </View>
    );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: object }) {
    return <View style={[styles.skeleton, { height, width }, style]} />;
}

export function ProductGridSkeleton() {
    return (
        <View style={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={styles.skeletonCard}>
                    <Skeleton height={150} />
                    <Skeleton height={12} style={{ marginTop: 10 }} />
                    <Skeleton height={12} width="65%" style={{ marginTop: 6 }} />
                </View>
            ))}
        </View>
    );
}

export function Divider() {
    return <View style={styles.divider} />;
}

export function KeyValue({
    label,
    value,
    valueStyle,
    strong,
}: {
    label: string;
    value: string;
    valueStyle?: object;
    strong?: boolean;
}) {
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{label}</Text>
            <Text style={[styles.kvValue, strong && styles.kvStrong, valueStyle]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    btn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: 'transparent' },
    dark: { backgroundColor: colors.primaryDeep },
    btnDisabled: { opacity: 0.5 },
    btnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
    btnTextOutline: { color: colors.primary },
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
    headerSub: { marginTop: 4, fontSize: 14, color: colors.textMuted },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    sectionAction: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceMuted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
    },
    badgeSuccess: { backgroundColor: colors.successSoft },
    badgeWarning: { backgroundColor: colors.warningSoft },
    badgeDanger: { backgroundColor: colors.dangerSoft },
    badgePrimary: { backgroundColor: colors.primarySoft },
    badgeText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.2 },
    badgeTextSuccess: { color: colors.success },
    badgeTextWarning: { color: colors.warning },
    badgeTextDanger: { color: colors.danger },
    badgeTextPrimary: { color: colors.primary },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
    },
    chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    chipTextActive: { color: '#fff' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    emptyIconText: { fontSize: 24, fontWeight: '900', color: colors.primary },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
    emptyMsg: { marginTop: 8, textAlign: 'center', color: colors.textMuted, lineHeight: 21, maxWidth: 280 },
    emptyAction: { marginTop: 20, alignSelf: 'stretch', paddingHorizontal: 24 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    funny: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
    funnyCompact: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 6 },
    funnyRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    funnyLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    funnyQuip: { fontSize: 11.5, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },
    skeleton: { backgroundColor: '#F3E7EE', borderRadius: 8 },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        gap: 10,
    },
    skeletonCard: {
        width: '47%',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
    kvLabel: { fontSize: 14, color: colors.textMuted },
    kvValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
    kvStrong: { fontSize: 17, fontWeight: '800' },
});
