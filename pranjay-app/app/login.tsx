import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signInWithPhoneNumber, type ConfirmationResult } from '@react-native-firebase/auth';
import { api } from '@/src/lib/api';
import { useAuthStore } from '@/src/store/auth';
import { PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { SUPPORT_EMAIL, WEBSITE_URL } from '@/src/config';
import { colors, radius, spacing } from '@/src/theme/colors';

/** Native Firebase phone verification — same SMS OTP flow as the website. */
export default function LoginScreen() {
    const router = useRouter();
    const { show } = useToast();
    const setSession = useAuthStore((s) => s.setSession);

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
    const otpInput = useRef<TextInput>(null);

    useEffect(() => {
        if (useAuthStore.getState().isAuthenticated()) {
            router.replace('/(tabs)');
        }
    }, [router]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendIn]);

    const friendlyError = (error: unknown): string => {
        const err = error as { code?: string; message?: string };
        const code = err?.code ?? '';
        if (code.includes('invalid-phone-number')) return 'That mobile number is not valid. Check the 10 digits and try again.';
        if (code.includes('too-many-requests') || code.includes('quota-exceeded')) {
            return 'Too many OTP requests. Please wait a few minutes and try again.';
        }
        if (code.includes('invalid-verification-code')) return 'That code is incorrect. Check the SMS and try again.';
        if (code.includes('session-expired')) return 'That code expired. Request a new OTP.';
        if (code.includes('code-expired')) return 'That code expired. Request a new OTP.';
        if (code.includes('missing-client-identifier')) {
            return Platform.OS === 'ios'
                ? 'iPhone sign-in is missing its Firebase iOS configuration. Install the latest build; if it still fails, contact support so we can finish the iOS setup.'
                : 'Phone sign-in is not configured for this app build. Update the app or contact support.';
        }
        if (code.includes('app-not-authorized') || code.includes('invalid-app-credential')) {
            return 'Phone sign-in is not configured for this app build. Update the app or contact support.';
        }
        if (code.includes('network')) return 'Network error. Check your connection and try again.';
        return err?.message || 'Something went wrong. Please try again.';
    };

    const sendOtp = async (isResend = false) => {
        const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        if (!/^[6-9]\d{9}$/.test(digits)) {
            show('Enter a valid 10-digit Indian mobile number', 'error');
            return;
        }
        setLoading(true);
        try {
            const result = await signInWithPhoneNumber(getAuth(), `+91${digits}`);
            setConfirmation(result);
            setOtpSent(true);
            setOtp('');
            setResendIn(30);
            show(isResend ? 'A new OTP has been sent' : 'OTP sent to your mobile');
            setTimeout(() => otpInput.current?.focus(), 300);
        } catch (e: unknown) {
            show(friendlyError(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const verify = async () => {
        if (!confirmation) {
            show('Request an OTP first', 'error');
            return;
        }
        if (otp.length !== 6) {
            show('Enter the 6-digit code from the SMS', 'error');
            return;
        }
        setLoading(true);
        try {
            const credential = await confirmation.confirm(otp);
            const idToken = await credential.user.getIdToken();
            const session = await api.verifyFirebase(idToken);
            await setSession(session.access_token, session.refresh_token, session.user);

            const user = session.user;
            const hasName = Boolean(user.full_name && user.full_name.trim() && user.full_name !== user.phone);
            if (!hasName) {
                router.replace('/profile/edit?onboarding=1');
                return;
            }
            if (user.seller_status === 'pending' || user.seller_status === 'rejected') {
                router.replace('/seller-onboarding');
                return;
            }
            router.replace('/(tabs)');
        } catch (e: unknown) {
            show(friendlyError(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const changeNumber = () => {
        setOtpSent(false);
        setConfirmation(null);
        setOtp('');
        setResendIn(0);
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.brandRow}>
                    <View style={styles.logo}>
                        <Text style={styles.logoText}>P</Text>
                    </View>
                    <View>
                        <Text style={styles.brand}>Pranjay</Text>
                        <Text style={styles.brandSub}>Wholesale beauty marketplace</Text>
                    </View>
                </View>

                <ScreenHeader
                    title={otpSent ? 'Verify your number' : 'Sign in with your phone'}
                    subtitle={
                        otpSent
                            ? `Enter the 6-digit code sent to +91 ${phone}`
                            : 'No passwords. We will text you a one-time code.'
                    }
                />

                <View style={styles.card}>
                    {!otpSent ? (
                        <>
                            <Text style={styles.label}>Mobile number</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.prefix}>
                                    <Text style={styles.prefixText}>🇮🇳 +91</Text>
                                </View>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="98765 43210"
                                    placeholderTextColor={colors.textFaint}
                                    keyboardType="phone-pad"
                                    textContentType="telephoneNumber"
                                    autoComplete="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                                />
                            </View>
                            <Text style={styles.hint}>
                                Use the number linked to your business. OTP delivery is free.
                            </Text>
                            <PrimaryButton label="Send OTP" onPress={() => void sendOtp(false)} loading={loading} />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Verification code</Text>
                            <TextInput
                                ref={otpInput}
                                style={styles.otpInput}
                                placeholder="••••••"
                                placeholderTextColor="#E7B7CB"
                                keyboardType="number-pad"
                                textContentType="oneTimeCode"
                                autoComplete="sms-otp"
                                maxLength={6}
                                value={otp}
                                onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                                onSubmitEditing={() => void verify()}
                            />

                            <PrimaryButton label="Verify & continue" onPress={() => void verify()} loading={loading} />

                            <View style={styles.resendRow}>
                                <Text style={styles.resendMuted}>Didn&apos;t receive it?</Text>
                                {resendIn > 0 ? (
                                    <Text style={styles.resendDisabled}>Resend in {resendIn}s</Text>
                                ) : (
                                    <Pressable onPress={() => void sendOtp(true)} hitSlop={8}>
                                        <Text style={styles.resend}>Resend OTP</Text>
                                    </Pressable>
                                )}
                            </View>
                            <Pressable style={styles.changeBtn} onPress={changeNumber}>
                                <Ionicons name="arrow-back" size={14} color={colors.primary} />
                                <Text style={styles.changeText}>Use a different number</Text>
                            </Pressable>
                        </>
                    )}
                </View>

                {!otpSent ? (
                    <View style={styles.trustCard}>
                        <Row icon="shield-checkmark-outline" text="Phone verified through Firebase SMS" />
                        <Row icon="lock-closed-outline" text="Your number is never shown publicly" />
                        <Row icon="bag-handle-outline" text="Cart, wishlist and orders stay synced" />
                    </View>
                ) : null}

                <Text style={styles.terms}>
                    By continuing you agree to our{' '}
                    <Text style={styles.link} onPress={() => void Linking.openURL(`${WEBSITE_URL}/terms`)}>
                        Terms
                    </Text>{' '}
                    and{' '}
                    <Text style={styles.link} onPress={() => void Linking.openURL(`${WEBSITE_URL}/privacy`)}>
                        Privacy Policy
                    </Text>
                    .
                </Text>

                <Pressable
                    style={styles.support}
                    onPress={() =>
                        Alert.alert(
                            'Need help signing in?',
                            `Email us at ${SUPPORT_EMAIL} and we will help you get into your account.`,
                            [
                                { text: 'Close', style: 'cancel' },
                                { text: 'Email support', onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
                            ]
                        )
                    }
                >
                    <Text style={styles.supportText}>Trouble signing in?</Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.trustRow}>
            <Ionicons name={icon} size={16} color={colors.primary} />
            <Text style={styles.trustText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, paddingBottom: 36 },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: 18,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: { color: '#fff', fontSize: 22, fontWeight: '900' },
    brand: { fontSize: 19, fontWeight: '800', color: colors.text },
    brandSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    card: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
    phoneRow: { flexDirection: 'row', gap: 8 },
    prefix: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: '#FFFCFE',
    },
    prefixText: { fontSize: 14, fontWeight: '700', color: colors.text },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 17,
        letterSpacing: 1,
        color: colors.text,
        backgroundColor: '#FFFCFE',
    },
    hint: { fontSize: 11.5, color: colors.textMuted, marginTop: -4, lineHeight: 16 },
    otpInput: {
        borderWidth: 1.5,
        borderColor: '#F4C7D8',
        borderRadius: radius.md,
        paddingVertical: 14,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 12,
        textAlign: 'center',
        color: colors.primaryDeep,
        backgroundColor: '#FFFBFD',
    },
    resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    resendMuted: { fontSize: 12.5, color: colors.textMuted },
    resend: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
    resendDisabled: { fontSize: 12.5, fontWeight: '700', color: colors.textFaint },
    changeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2 },
    changeText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
    trustCard: {
        marginHorizontal: spacing.xl,
        marginTop: 18,
        backgroundColor: colors.primaryFaint,
        borderRadius: radius.lg,
        padding: 16,
        gap: 11,
        borderWidth: 1,
        borderColor: '#F9D9E5',
    },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    trustText: { flex: 1, fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
    terms: {
        marginTop: 20,
        paddingHorizontal: 32,
        fontSize: 10.5,
        lineHeight: 15,
        color: colors.textFaint,
        textAlign: 'center',
    },
    link: { color: colors.primary, fontWeight: '700' },
    support: { alignSelf: 'center', marginTop: 14, padding: 8 },
    supportText: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textDecorationLine: 'underline' },
});
