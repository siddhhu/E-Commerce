import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth';
import { SUPPORT_EMAIL, WEBSITE_URL } from '@/src/config';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function ProfileScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));

    const handleLogout = () => {
        Alert.alert('Sign out?', 'Your cart and orders stay safe on your account.', [
            { text: 'Stay signed in', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(tabs)');
                },
            },
        ]);
    };

    if (!authenticated || !user) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <ScreenHeader title="Profile" subtitle="Guest mode" />
                <View style={styles.guestCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>P</Text>
                    </View>
                    <Text style={styles.guestTitle}>Browse as guest</Text>
                    <Text style={styles.guestSub}>
                        Sign in with your mobile number to sync your cart, wishlist, addresses and orders.
                    </Text>
                    <View style={styles.guestCta}>
                        <PrimaryButton label="Sign in with phone" onPress={() => router.push('/login')} />
                    </View>
                    <View style={styles.trustRow}>
                        <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                        <Text style={styles.trustText}>Secure OTP sign-in · no password needed</Text>
                    </View>
                </View>

                <MenuGroup
                    title="Explore"
                    items={[
                        { icon: 'grid-outline', label: 'Shop all products', onPress: () => router.push('/(tabs)/shop') },
                        { icon: 'search-outline', label: 'Search products', onPress: () => router.push('/search') },
                        { icon: 'call-outline', label: 'Contact support', onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
                    ]}
                />
                <Text style={styles.version}>Pranjay app v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            </SafeAreaView>
        );
    }

    const initials = (user.full_name || user.business_name || 'P')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    const kycDone = Boolean(user.kyc_verified_at && user.kyc_document_url);
    const sellerStatus = user.seller_status ?? 'none';

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScreenHeader title="Profile" subtitle="Manage your Pranjay account" right={null} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.identityRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials || 'P'}</Text>
                        </View>
                        <View style={styles.identityText}>
                            <Text style={styles.name}>{user.full_name || 'Add your name'}</Text>
                            <Text style={styles.phone}>{user.phone || 'Phone not set'}</Text>
                            {user.contact_email ? <Text style={styles.email}>{user.contact_email}</Text> : null}
                        </View>
                        <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
                            <Ionicons name="create-outline" size={17} color={colors.primary} />
                        </Pressable>
                    </View>

                    <View style={styles.badgeRow}>
                        <Badge label={user.user_type === 'seller' ? 'B2B seller' : 'Customer'} tone="primary" />
                        {kycDone ? <Badge label="KYC verified" tone="success" /> : <Badge label="KYC pending" tone="warning" />}
                        {sellerStatus === 'pending' ? <Badge label="Seller review" tone="warning" /> : null}
                        {sellerStatus === 'approved' ? <Badge label="Approved seller" tone="success" /> : null}
                    </View>

                    {user.business_name ? (
                        <View style={styles.businessRow}>
                            <Ionicons name="business-outline" size={15} color={colors.textMuted} />
                            <Text style={styles.businessText}>{user.business_name}</Text>
                        </View>
                    ) : null}
                    {user.gst_number ? (
                        <View style={styles.businessRow}>
                            <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
                            <Text style={styles.businessText}>GST {user.gst_number}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.quickGrid}>
                    <QuickLink icon="receipt-outline" label="Orders" onPress={() => router.push('/(tabs)/orders')} />
                    <QuickLink icon="heart-outline" label="Wishlist" onPress={() => router.push('/wishlist')} />
                    <QuickLink icon="location-outline" label="Addresses" onPress={() => router.push('/addresses')} />
                    <QuickLink icon="create-outline" label="Edit profile" onPress={() => router.push('/profile/edit')} />
                </View>

                <MenuGroup
                    title="Business"
                    items={[
                        {
                            icon: 'storefront-outline',
                            label:
                                sellerStatus === 'approved'
                                    ? 'Seller account'
                                    : sellerStatus === 'pending'
                                      ? 'Seller application status'
                                      : 'Become a seller',
                            onPress: () => router.push('/seller-onboarding'),
                        },
                        {
                            icon: 'shield-checkmark-outline',
                            label: kycDone ? 'KYC verification complete' : 'Complete KYC verification',
                            onPress: () => router.push('/addresses'),
                        },
                    ]}
                />

                <MenuGroup
                    title="Support"
                    items={[
                        {
                            icon: 'mail-outline',
                            label: 'Email support',
                            onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
                        },
                        {
                            icon: 'globe-outline',
                            label: 'Visit pranjay.com',
                            onPress: () => void Linking.openURL(WEBSITE_URL),
                        },
                        {
                            icon: 'document-text-outline',
                            label: 'Terms & privacy',
                            onPress: () => void Linking.openURL(`${WEBSITE_URL}/terms`),
                        },
                        {
                            // Google Play requires a reachable deletion path for any app
                            // that lets people create an account.
                            icon: 'trash-outline',
                            label: 'Delete my account',
                            onPress: () => void Linking.openURL(`${WEBSITE_URL}/account-deletion`),
                        },
                    ]}
                />

                <Pressable style={styles.signOut} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                    <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>

                <Text style={styles.version}>Pranjay app v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

function QuickLink({
    icon,
    label,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
}) {
    return (
        <Pressable style={styles.quickItem} onPress={onPress}>
            <View style={styles.quickIcon}>
                <Ionicons name={icon} size={19} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel}>{label}</Text>
        </Pressable>
    );
}

function MenuGroup({
    title,
    items,
}: {
    title: string;
    items: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }>;
}) {
    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>{title}</Text>
            <View style={styles.menu}>
                {items.map((item, index) => (
                    <Pressable
                        key={item.label}
                        style={[styles.menuRow, index < items.length - 1 && styles.menuRowBorder]}
                        onPress={item.onPress}
                    >
                        <View style={styles.menuIcon}>
                            <Ionicons name={item.icon} size={17} color={colors.textMuted} />
                        </View>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, paddingBottom: 28 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '900', color: colors.primary },
    identityText: { flex: 1 },
    name: { fontSize: 18, fontWeight: '800', color: colors.text },
    phone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    email: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
    editBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: colors.primaryFaint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 13 },
    businessRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
    businessText: { fontSize: 12, color: colors.textMuted },
    quickGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
    quickItem: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 13,
        alignItems: 'center',
        gap: 7,
    },
    quickIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primaryFaint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: { fontSize: 10.5, fontWeight: '700', color: colors.text },
    group: { marginTop: 20 },
    groupTitle: {
        fontSize: 10.5,
        fontWeight: '900',
        letterSpacing: 1.4,
        color: colors.textFaint,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    menu: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 14 },
    menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text },
    signOut: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginTop: 22,
        paddingVertical: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#FECACA',
        backgroundColor: colors.dangerSoft,
    },
    signOutText: { color: colors.danger, fontWeight: '800', fontSize: 13.5 },
    version: { textAlign: 'center', fontSize: 10.5, color: colors.textFaint, marginTop: 18 },
    guestCard: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 22,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    guestTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    guestSub: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    guestCta: { alignSelf: 'stretch', marginTop: 10 },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    trustText: { fontSize: 10.5, color: colors.textMuted },
});
