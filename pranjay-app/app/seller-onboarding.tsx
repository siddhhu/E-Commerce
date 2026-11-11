import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DocumentUpload } from '@/src/components/DocumentUpload';
import { PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { api } from '@/src/lib/api';
import type { PickedDocument } from '@/src/lib/documents';
import { useAuthStore } from '@/src/store/auth';
import { colors } from '@/src/theme/colors';

const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Seller application mirrors the website's profile-setup and document step. */
export default function SellerOnboardingScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const [fullName, setFullName] = useState(user?.full_name ?? '');
    const [businessName, setBusinessName] = useState(user?.business_name ?? '');
    const [email, setEmail] = useState(user?.contact_email ?? user?.email ?? '');
    const [gst, setGst] = useState(user?.gst_number ?? '');
    const [holderName, setHolderName] = useState(user?.bank_account_holder_name ?? '');
    const [accountNumber, setAccountNumber] = useState(user?.bank_account_number ?? '');
    const [ifsc, setIfsc] = useState(user?.bank_ifsc ?? '');
    const [bankName, setBankName] = useState(user?.bank_name ?? '');
    const [businessDocument, setBusinessDocument] = useState<PickedDocument | null>(null);
    const [bankDocument, setBankDocument] = useState<PickedDocument | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) router.replace('/login');
    }, [router, user]);

    if (!user) return null;

    if (user.seller_status === 'pending' || user.seller_status === 'approved') {
        const approved = user.seller_status === 'approved';
        return (
            <View style={styles.root}>
                <ScreenHeader title={approved ? 'Seller account active' : 'Application under review'} />
                <View style={styles.statusCard}>
                    <Text style={styles.statusTitle}>{approved ? 'You are an approved seller' : 'Your seller application is submitted'}</Text>
                    <Text style={styles.statusText}>
                        {approved
                            ? 'Your seller account is ready. Use the seller portal on the web for catalogue management.'
                            : 'We will review your documents and notify you at your registered email address.'}
                    </Text>
                    <PrimaryButton label="Back to profile" onPress={() => router.replace('/(tabs)/profile')} />
                </View>
            </View>
        );
    }

    const submit = async () => {
        const normalizedGst = gst.trim().toUpperCase();
        const normalizedIfsc = ifsc.trim().toUpperCase();
        const digits = accountNumber.replace(/\D/g, '');
        if (!fullName.trim() || !businessName.trim()) {
            Alert.alert('Business details required', 'Enter your name and business name.');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            Alert.alert('Valid email required', 'Enter the email where you want seller updates.');
            return;
        }
        if (!GST_PATTERN.test(normalizedGst)) {
            Alert.alert('Invalid GST number', 'Enter a valid 15-character GST number, for example 27AABCU9603R1ZV.');
            return;
        }
        if (!businessDocument || !bankDocument) {
            Alert.alert('Documents required', 'Add your business registration document and bank proof.');
            return;
        }
        if (!holderName.trim() || digits.length < 9 || digits.length > 18 || !IFSC_PATTERN.test(normalizedIfsc)) {
            Alert.alert('Bank details incomplete', 'Enter the account holder name, a 9–18 digit account number, and a valid IFSC (for example HDFC0001234).');
            return;
        }
        if (!termsAccepted) {
            Alert.alert('Terms required', 'Confirm that you agree to the seller terms before submitting.');
            return;
        }

        setSaving(true);
        try {
            // The invoice endpoint only accepts seller accounts, so save the seller
            // profile first, just as the web flow does.
            const profile = await api.updateProfile({
                full_name: fullName.trim(),
                business_name: businessName.trim(),
                contact_email: email.trim().toLowerCase(),
                gst_number: normalizedGst,
                user_type: 'seller',
            });
            await setUser(profile);
            const [businessUpload, bankUpload] = await Promise.all([
                api.uploadSellerDocument(businessDocument),
                api.uploadSellerDocument(bankDocument),
            ]);
            const updated = await api.submitSellerApplication({
                invoice_url: businessUpload.invoice_url,
                bank_proof_url: bankUpload.invoice_url,
                bank_account_holder_name: holderName.trim(),
                bank_account_number: digits,
                bank_ifsc: normalizedIfsc,
                bank_name: bankName.trim() || undefined,
            });
            await setUser(updated);
            Alert.alert('Application submitted', 'Your seller application is under review. We will send updates to your registered email.');
            router.replace('/(tabs)/profile');
        } catch (error: unknown) {
            Alert.alert('Could not submit application', error instanceof Error ? error.message : 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <ScreenHeader title="Become a seller" subtitle="Apply in a few simple steps" />
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Business details</Text>
                    <Field label="Your full name" value={fullName} onChangeText={setFullName} placeholder="Name as per GST records" />
                    <Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Your shop or company name" />
                    <Field label="Email for application updates" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                    <Field label="GST number" value={gst} onChangeText={(value) => setGst(value.toUpperCase())} placeholder="27AABCU9603R1ZV" autoCapitalize="characters" maxLength={15} />

                    <Text style={styles.sectionTitle}>Business registration document</Text>
                    <Text style={styles.help}>Upload your GST certificate or business registration document.</Text>
                    <DocumentUpload file={businessDocument} uploading={saving} onPick={setBusinessDocument} />

                    <Text style={styles.sectionTitle}>Bank details</Text>
                    <Field label="Account holder name" value={holderName} onChangeText={setHolderName} placeholder="Name as per bank records" />
                    <Field label="Account number" value={accountNumber} onChangeText={(value) => setAccountNumber(value.replace(/\D/g, ''))} placeholder="9 to 18 digit account number" keyboardType="number-pad" />
                    <Field label="IFSC code" value={ifsc} onChangeText={(value) => setIfsc(value.toUpperCase())} placeholder="HDFC0001234" autoCapitalize="characters" maxLength={11} />
                    <Field label="Bank name (optional)" value={bankName} onChangeText={setBankName} placeholder="For example, HDFC Bank" />
                    <Text style={styles.help}>Bank proof can be a cancelled cheque, passbook photo, or bank statement.</Text>
                    <DocumentUpload file={bankDocument} uploading={saving} onPick={setBankDocument} />

                    <Pressable style={styles.terms} onPress={() => setTermsAccepted((value) => !value)}>
                        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>{termsAccepted ? <Text style={styles.check}>✓</Text> : null}</View>
                        <Text style={styles.termsText}>I have read and agree to the seller terms and confirm that these details are accurate.</Text>
                    </Pressable>
                    <PrimaryButton label="Submit seller application" onPress={submit} loading={saving} disabled={saving} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
    return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} placeholderTextColor="#94A3B8" {...props} /></View>;
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg }, scroll: { paddingBottom: 40 },
    card: { marginHorizontal: 20, padding: 18, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20 },
    sectionTitle: { marginTop: 4, fontSize: 17, fontWeight: '800', color: colors.text }, help: { marginTop: -6, fontSize: 13, lineHeight: 18, color: colors.textMuted },
    field: { gap: 6 }, label: { color: colors.text, fontSize: 13, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: '#FAFAFA' },
    terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 }, checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: '#fff', fontWeight: '900' }, termsText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted },
    statusCard: { margin: 20, backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 12 }, statusTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, statusText: { color: colors.textMuted, lineHeight: 20 },
});
