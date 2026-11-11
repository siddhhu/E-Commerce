import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPPORT_EMAIL } from '@/src/config';
import { colors, radius, spacing } from '@/src/theme/colors';
import { Linking } from 'react-native';

/** Shown when a link points at a screen this build does not have. */
export default function NotFoundScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <View style={styles.body}>
                <View style={styles.icon}>
                    <Ionicons name="link-outline" size={30} color={colors.primary} />
                </View>
                <Text style={styles.title}>We couldn&apos;t open that link</Text>
                <Text style={styles.subtitle}>
                    The page may have moved, or the link was made for an older version of the app. You can
                    keep shopping — nothing in your account has changed.
                </Text>

                <Pressable style={styles.primary} onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.primaryText}>Go to home</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)/shop')}>
                    <Text style={styles.secondaryText}>Browse products</Text>
                </Pressable>
            </View>

            <Pressable onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={styles.support}>
                <Text style={styles.supportText}>Still stuck? Email {SUPPORT_EMAIL}</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    icon: {
        width: 64,
        height: 64,
        borderRadius: 22,
        backgroundColor: colors.primaryFaint,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: { fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
    primary: {
        alignSelf: 'stretch',
        marginTop: 14,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    secondary: { alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center' },
    secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    support: { paddingVertical: 14, alignItems: 'center' },
    supportText: { fontSize: 11.5, color: colors.textMuted },
});
