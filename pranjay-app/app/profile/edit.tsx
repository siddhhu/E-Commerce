import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import { useAuthStore } from '@/src/store/auth';
import { PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { colors, radius, spacing } from '@/src/theme/colors';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export default function EditProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ onboarding?: string }>();
    const onboarding = params.onboarding === '1';
    const { show } = useToast();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [fullName, setFullName] = useState(user?.full_name ?? '');
    const [businessName, setBusinessName] = useState(user?.business_name ?? '');
    const [contactEmail, setContactEmail] = useState(user?.contact_email ?? '');
    const [gst, setGst] = useState(user?.gst_number ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) router.replace('/login');
    }, [router, user]);

    if (!user) return null;

    const save = async () => {
        const name = fullName.trim();
        if (name.length < 2) {
            show('Enter your full name', 'error');
            return;
        }
        const email = contactEmail.trim().toLowerCase();
        if (email && !EMAIL_REGEX.test(email)) {
            show('Enter a valid email address, or leave it blank', 'error');
            return;
        }
        const gstValue = gst.trim().toUpperCase();
        if (gstValue && !GST_REGEX.test(gstValue)) {
            show('Enter a valid 15-character GST number, or leave it blank', 'error');
            return;
        }

        setSaving(true);
        try {
            const updated = await api.updateProfile({
                full_name: name,
                business_name: businessName.trim() || undefined,
                contact_email: email || undefined,
                gst_number: gstValue || undefined,
            });
            await setUser(updated);
            show(onboarding ? 'Welcome to Pranjay!' : 'Profile updated');
            if (onboarding) router.replace('/(tabs)');
            else router.back();
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not save your profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen options={{ title: onboarding ? 'Your details' : 'Edit profile' }} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <ScreenHeader
                    title={onboarding ? 'Tell us about you' : 'Your details'}
                    subtitle={
                        onboarding
                            ? 'This helps us create invoices and deliver your orders correctly.'
                            : 'Keep your contact and business details up to date.'
                    }
                />

                {onboarding ? (
                    <View style={styles.welcomeCard}>
                        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                        <Text style={styles.welcomeText}>
                            Your number {user.phone} is verified. Add your name to finish setting up your account.
                        </Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Field label="Full name *" value={fullName} onChangeText={setFullName} placeholder="Name of the account holder" autoCapitalize="words" />
                    <Field
                        label="Business / shop name"
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="Optional, e.g. Glow Salon"
                        autoCapitalize="words"
                    />
                    <Field
                        label="Email for order updates"
                        value={contactEmail}
                        onChangeText={setContactEmail}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <Text style={styles.help}>We use this for invoices and order updates. It is not used to sign in.</Text>
                    <Field
                        label="GST number"
                        value={gst}
                        onChangeText={(value) => setGst(value.toUpperCase())}
                        placeholder="Optional, e.g. 27AABCU9603R1ZV"
                        autoCapitalize="characters"
                        maxLength={15}
                    />

                    <View style={styles.phoneRow}>
                        <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.phoneText}>Signed in with {user.phone}</Text>
                        <View style={styles.verifiedPill}>
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    </View>

                    <PrimaryButton label={onboarding ? 'Save & start shopping' : 'Save changes'} onPress={() => void save()} loading={saving} />
                    {onboarding ? (
                        <Pressable style={styles.skip} onPress={() => router.replace('/(tabs)')}>
                            <Text style={styles.skipText}>I&apos;ll do this later</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.note}>
                    <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.noteText}>
                        Your mobile number is your login. Contact support to change it.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Field({
    label,
    ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} placeholderTextColor={colors.textFaint} {...props} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    welcomeCard: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.primaryFaint,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F9D9E5',
        marginBottom: 14,
    },
    welcomeText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    card: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    field: { gap: 6 },
    label: { fontSize: 12.5, fontWeight: '700', color: colors.text },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
        backgroundColor: '#FFFCFE',
    },
    help: { marginTop: -6, fontSize: 10.5, color: colors.textFaint, lineHeight: 14 },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: 12,
    },
    phoneText: { flex: 1, fontSize: 12, color: colors.textMuted },
    verifiedPill: { backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    verifiedText: { color: colors.success, fontSize: 9.5, fontWeight: '800' },
    skip: { alignItems: 'center', paddingVertical: 6 },
    skipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textDecorationLine: 'underline' },
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 24,
    },
    noteText: { fontSize: 10.5, color: colors.textFaint, textAlign: 'center' },
});
