import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/lib/api';
import type { Address, Cart, User } from '@/src/lib/types';
import { formatPrice } from '@/src/lib/format';
import {
    COD_RESTRICTED_MESSAGE,
    isCodAllowed,
} from '@/src/lib/pricing';
import {
    KYC_DOCUMENT_TYPES,
    documentLabel,
    isKycComplete,
    isValidDocumentNumber,
    normalizeDocumentNumber,
    savedDocumentFor,
    type KycDocumentType,
} from '@/src/lib/kyc';
import { isRazorpayNativeAvailable, openRazorpayPayment } from '@/src/lib/razorpay';
import { AddressForm, emptyAddress, validateAddress, type AddressDraft } from '@/src/components/AddressForm';
import { DocumentUpload } from '@/src/components/DocumentUpload';
import type { PickedDocument } from '@/src/lib/documents';
import { PriceBreakdown } from '@/src/components/PriceBreakdown';
import { EmptyState, LoadingScreen, PrimaryButton } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { colors, radius, spacing } from '@/src/theme/colors';

function draftFromAddress(item: Address): AddressDraft {
    return {
        label: item.label ?? 'home',
        full_name: item.full_name,
        phone: item.phone.replace(/\D/g, '').slice(-10),
        address_line1: item.address_line1,
        address_line2: item.address_line2 ?? '',
        city: item.city,
        state: item.state,
        postal_code: item.postal_code,
    };
}

export default function CheckoutScreen() {
    const router = useRouter();
    const { show } = useToast();
    const user = useAuthStore((s) => s.user);
    const authenticated = useAuthStore((s) => s.accessToken);
    const setUser = useAuthStore((s) => s.setUser);
    const promo = useCartStore((s) => s.promo);
    const refreshCart = useCartStore((s) => s.refresh);

    // Seeded from the cart screen's warm-up so checkout opens without a blank wait.
    const cachedPrep = useMemo(() => api.peekCheckoutPrep(), []);
    const cachedAddress =
        cachedPrep?.addresses.find((item) => item.is_default) ?? cachedPrep?.addresses[0];

    const [cart, setCart] = useState<Cart | null>(cachedPrep?.cart ?? null);
    const [profile, setProfile] = useState<User | null>(user);
    const [addresses, setAddresses] = useState<Address[]>(cachedPrep?.addresses ?? []);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(cachedAddress?.id ?? null);
    const [address, setAddress] = useState<AddressDraft>(
        cachedAddress ? draftFromAddress(cachedAddress) : emptyAddress()
    );
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
    const [loading, setLoading] = useState(!cachedPrep);
    const [placing, setPlacing] = useState(false);

    const initialDoc = useMemo(() => savedDocumentFor(profile), [profile]);
    const [docType, setDocType] = useState<KycDocumentType>(initialDoc.type);
    const [docNumber, setDocNumber] = useState(initialDoc.number);
    const [docFile, setDocFile] = useState<PickedDocument | null>(null);
    const [docUrl, setDocUrl] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const kycComplete = isKycComplete(profile);
    const razorpayReady = isRazorpayNativeAvailable();

    const load = useCallback(async () => {
        try {
            const [prep, me] = await Promise.all([
                api.getCheckoutPrep(),
                api.getMe().catch(() => null),
            ]);
            setCart(prep.cart);
            setAddresses(prep.addresses);
            if (me) {
                setProfile(me);
                await setUser(me);
            }

            const defaultAddress = prep.addresses.find((item) => item.is_default) ?? prep.addresses[0];
            if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id);
                setAddress(draftFromAddress(defaultAddress));
            } else {
                setAddress(
                    emptyAddress(
                        me?.full_name ?? '',
                        (me?.phone ?? '').replace(/\D/g, '').slice(-10)
                    )
                );
            }
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not start checkout', 'error');
        } finally {
            setLoading(false);
        }
    }, [setUser, show]);

    useEffect(() => {
        if (!authenticated) {
            setLoading(false);
            return;
        }
        void load();
    }, [authenticated, load]);

    useEffect(() => {
        if (savedDocumentFor(profile).number && !docNumber) {
            const saved = savedDocumentFor(profile);
            setDocType(saved.type);
            setDocNumber(saved.number);
        }
    }, [profile, docNumber]);

    const pinComplete = address.postal_code.replace(/\D/g, '').length === 6;
    const codAllowed = isCodAllowed(address.postal_code);

    useEffect(() => {
        if (pinComplete && !codAllowed && paymentMethod === 'cod') {
            setPaymentMethod('online');
        }
    }, [pinComplete, codAllowed, paymentMethod]);

    const documentNumberValid = isValidDocumentNumber(docType, docNumber);
    const blockedAccount =
        profile?.role === 'ADMIN' ||
        profile?.role === 'SUPER_ADMIN' ||
        (profile?.seller_status === 'approved' && profile?.user_type === 'seller');

    const selectSavedAddress = (item: Address) => {
        setSelectedAddressId(item.id);
        setAddress(draftFromAddress(item));
    };

    const handleDocumentPicked = async (file: PickedDocument) => {
        setDocFile(file);
        setDocUrl('');
        setUploadingDoc(true);
        try {
            const uploaded = await api.uploadKycDocument(file);
            setDocUrl(uploaded.document_url);
            show('Document uploaded securely');
        } catch (error) {
            setDocFile(null);
            show(error instanceof Error ? error.message : 'Could not upload the document', 'error');
        } finally {
            setUploadingDoc(false);
        }
    };

    const ensureKyc = async (): Promise<boolean> => {
        if (kycComplete) return true;
        if (!documentNumberValid) {
            show('Enter a valid document number for verification', 'error');
            return false;
        }
        if (!docUrl) {
            show('Upload a photo or PDF of your document', 'error');
            return false;
        }
        try {
            const updated = await api.submitKyc({
                document_type: docType,
                document_number: normalizeDocumentNumber(docType, docNumber),
                document_url: docUrl,
            });
            setProfile(updated);
            await setUser(updated);
            return true;
        } catch (error) {
            show(error instanceof Error ? error.message : 'Document verification failed', 'error');
            return false;
        }
    };

    const finishOrder = async (orderId: string, orderNumber: string) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshCart().catch(() => undefined);
        show(`Order #${orderNumber} confirmed`);
        router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    };

    const placeOrder = async () => {
        if (!cart || cart.items.length === 0) {
            show('Your cart is empty', 'error');
            return;
        }
        if (blockedAccount) {
            show('Admin and seller accounts cannot place orders. Use a customer account.', 'error');
            return;
        }
        const addressError = validateAddress(address);
        if (addressError) {
            show(addressError, 'error');
            return;
        }
        if (paymentMethod === 'cod' && !codAllowed) {
            show(COD_RESTRICTED_MESSAGE, 'error');
            return;
        }
        if (paymentMethod === 'online' && !razorpayReady) {
            show('Online payment needs the installed Pranjay app (not Expo Go).', 'error');
            return;
        }

        setPlacing(true);
        try {
            const kycReady = await ensureKyc();
            if (!kycReady) return;

            const cartItems = cart.items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
            }));
            const phone = `+91${address.phone.replace(/\D/g, '').slice(-10)}`;
            const base = {
                full_name: address.full_name.trim(),
                phone,
                address_line1: address.address_line1.trim(),
                address_line2: address.address_line2.trim() || undefined,
                city: address.city.trim(),
                state: address.state,
                postal_code: address.postal_code,
                country: 'India',
                existing_address_id: selectedAddressId ?? undefined,
                cart_items: cartItems,
                promo_code: promo?.code,
            };

            if (paymentMethod === 'cod') {
                const order = await api.completeCheckout({ ...base, payment_method: 'cod' });
                await finishOrder(order.id, order.order_number);
                return;
            }

            const prep = await api.prepareCheckout({
                cart_items: cartItems,
                promo_code: promo?.code,
            });
            const payment = await openRazorpayPayment({
                orderId: prep.razorpay_order_id,
                amountPaise: prep.amount_paise,
                description: `Order of ${cart.items_count} item${cart.items_count === 1 ? '' : 's'}`,
                prefill: {
                    name: address.full_name,
                    email: profile?.contact_email || undefined,
                    contact: phone,
                },
            });

            const order = await api.completeCheckout({
                ...base,
                payment_method: 'online',
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_signature: payment.razorpay_signature,
            });
            await finishOrder(order.id, order.order_number);
        } catch (error) {
            const raw = error as { description?: string; message?: string };
            const message = raw?.description || raw?.message || 'Checkout failed. Please try again.';
            if (/cancel/i.test(message)) {
                show('Payment cancelled — no order was placed', 'info');
            } else if (/insufficient stock|not found|unavailable/i.test(message)) {
                show(message, 'error');
                void load();
            } else {
                show(message, 'error');
            }
        } finally {
            setPlacing(false);
        }
    };

    if (!authenticated) {
        return (
            <SafeAreaView style={styles.root} edges={['bottom']}>
                <EmptyState
                    title="Sign in to checkout"
                    message="Your cart and addresses are linked to your mobile number."
                    actionLabel="Sign in with phone"
                    onAction={() => router.push('/login')}
                />
            </SafeAreaView>
        );
    }

    if (loading) return <LoadingScreen label="Rolling out the checkout" />;

    if (!cart || cart.items.length === 0) {
        return (
            <SafeAreaView style={styles.root} edges={['bottom']}>
                <EmptyState
                    title="Nothing to check out"
                    message="Add products to your cart first."
                    actionLabel="Browse products"
                    onAction={() => router.push('/(tabs)/shop')}
                />
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Checkout' }} />
            <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.progressCard}>
                        <View style={styles.progressItem}>
                            <View style={styles.progressDotDone}>
                                <Text style={styles.progressTick}>✓</Text>
                            </View>
                            <Text style={styles.progressText}>Cart</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={styles.progressItem}>
                            <View style={styles.progressDotActive}>
                                <Text style={styles.progressActiveText}>2</Text>
                            </View>
                            <Text style={[styles.progressText, styles.progressActive]}>Delivery</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={styles.progressItem}>
                            <View style={styles.progressDot}>
                                <Text style={styles.progressDotText}>3</Text>
                            </View>
                            <Text style={styles.progressText}>Payment</Text>
                        </View>
                    </View>

                    {blockedAccount ? (
                        <View style={styles.warningCard}>
                            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                            <Text style={styles.warningText}>
                                You are signed in with an admin/seller account. Please use a customer account to place orders.
                            </Text>
                        </View>
                    ) : null}

                    {addresses.length > 0 ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Delivery address</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addrRow}>
                                {addresses.map((item) => {
                                    const active = selectedAddressId === item.id;
                                    return (
                                        <Pressable
                                            key={item.id}
                                            style={[styles.addrCard, active && styles.addrCardActive]}
                                            onPress={() => selectSavedAddress(item)}
                                        >
                                            <View style={styles.addrTop}>
                                                <Text style={styles.addrName} numberOfLines={1}>
                                                    {item.full_name}
                                                </Text>
                                                {active ? (
                                                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                                                ) : null}
                                            </View>
                                            <Text numberOfLines={1} style={styles.addrLine}>
                                                {item.address_line1}
                                            </Text>
                                            <Text numberOfLines={1} style={styles.addrLine}>
                                                {item.city}, {item.state} – {item.postal_code}
                                            </Text>
                                            {item.is_default ? <Text style={styles.defaultTag}>Default</Text> : null}
                                        </Pressable>
                                    );
                                })}
                                <Pressable
                                    style={[styles.addrCard, styles.addrNew, !selectedAddressId && styles.addrCardActive]}
                                    onPress={() => {
                                        setSelectedAddressId(null);
                                        setAddress(
                                            emptyAddress(
                                                profile?.full_name ?? '',
                                                (profile?.phone ?? '').replace(/\D/g, '').slice(-10)
                                            )
                                        );
                                    }}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                    <Text style={styles.addrNewText}>New address</Text>
                                </Pressable>
                            </ScrollView>

                            <View style={styles.formCard}>
                                <AddressForm
                                    value={address}
                                    onChange={(next) => {
                                        setSelectedAddressId(null);
                                        setAddress(next);
                                    }}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Delivery address</Text>
                            <View style={styles.formCard}>
                                <AddressForm value={address} onChange={setAddress} />
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Business verification</Text>
                            <View style={styles.oncePill}>
                                <Text style={styles.onceText}>One-time</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionHelp}>
                            Required once for GST invoicing. We will not ask again on future orders.
                        </Text>

                        <View style={styles.card}>
                            {kycComplete ? (
                                <View style={styles.kycDone}>
                                    <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.kycDoneTitle}>Verification complete</Text>
                                        <Text style={styles.kycDoneSub}>{documentLabel(profile?.kyc_document_type)}</Text>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docChips}>
                                        {KYC_DOCUMENT_TYPES.map((doc) => {
                                            const active = docType === doc.id;
                                            return (
                                                <Pressable
                                                    key={doc.id}
                                                    style={[styles.docChip, active && styles.docChipActive]}
                                                    onPress={() => {
                                                        setDocType(doc.id);
                                                        setDocNumber('');
                                                    }}
                                                >
                                                    <Text style={[styles.docChipText, active && styles.docChipTextActive]}>
                                                        {doc.short}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>

                                    <Text style={styles.fieldLabel}>{documentLabel(docType)} number *</Text>
                                    <View style={styles.docInputRow}>
                                        <TextInput
                                            style={[styles.input, styles.docInput]}
                                            placeholder={`Enter ${documentLabel(docType)} number`}
                                            placeholderTextColor={colors.textFaint}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            value={docNumber}
                                            onChangeText={(text) => setDocNumber(text.toUpperCase().replace(/\s/g, ''))}
                                        />
                                        {docNumber ? (
                                            <Ionicons
                                                name={documentNumberValid ? 'checkmark-circle' : 'alert-circle'}
                                                size={20}
                                                color={documentNumberValid ? colors.success : colors.warning}
                                            />
                                        ) : null}
                                    </View>
                                    {docNumber && !documentNumberValid ? (
                                        <Text style={styles.fieldError}>Check the number format for {documentLabel(docType)}.</Text>
                                    ) : null}

                                    <Text style={styles.fieldLabel}>Upload document *</Text>
                                    <DocumentUpload
                                        file={docFile}
                                        uploading={uploadingDoc}
                                        onPick={(file) => {
                                            if (file) void handleDocumentPicked(file);
                                            else {
                                                setDocFile(null);
                                                setDocUrl('');
                                            }
                                        }}
                                    />
                                    {docUrl ? (
                                        <Text style={styles.uploadedNote}>Uploaded — ready to submit with your order.</Text>
                                    ) : null}
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment method</Text>
                        <Pressable
                            style={[styles.payOption, paymentMethod === 'online' && styles.payOptionActive]}
                            onPress={() => setPaymentMethod('online')}
                        >
                            <View style={[styles.radio, paymentMethod === 'online' && styles.radioActive]}>
                                {paymentMethod === 'online' ? <View style={styles.radioDot} /> : null}
                            </View>
                            <View style={styles.payBody}>
                                <Text style={styles.payTitle}>Pay online</Text>
                                <Text style={styles.paySub}>UPI, cards, netbanking · secured by Razorpay</Text>
                                {!razorpayReady ? (
                                    <Text style={styles.payWarn}>Only available in the installed app build</Text>
                                ) : null}
                            </View>
                            <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                        </Pressable>

                        <Pressable
                            style={[
                                styles.payOption,
                                paymentMethod === 'cod' && styles.payOptionActive,
                                !codAllowed && styles.payOptionDisabled,
                            ]}
                            onPress={() => {
                                if (!codAllowed) {
                                    show(COD_RESTRICTED_MESSAGE, 'info');
                                    return;
                                }
                                setPaymentMethod('cod');
                            }}
                        >
                            <View style={[styles.radio, paymentMethod === 'cod' && styles.radioActive]}>
                                {paymentMethod === 'cod' ? <View style={styles.radioDot} /> : null}
                            </View>
                            <View style={styles.payBody}>
                                <Text style={styles.payTitle}>Cash on delivery</Text>
                                <Text style={styles.paySub}>
                                    {codAllowed ? 'Pay when your order arrives' : 'Available only for select PIN codes'}
                                </Text>
                            </View>
                            <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
                        </Pressable>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.sectionTitle}>Order summary</Text>
                        {promo ? (
                            <View style={styles.promoRow}>
                                <Ionicons name="pricetag-outline" size={15} color={colors.success} />
                                <Text style={styles.promoCode}>{promo.code}</Text>
                                <Text style={styles.promoValue}>− {formatPrice(promo.discount)}</Text>
                            </View>
                        ) : null}
                        <PriceBreakdown subtotal={cart.subtotal} promoDiscount={promo?.discount ?? 0} />
                    </View>

                    <View style={styles.secureRow}>
                        <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.secureText}>
                            Secure checkout · Genuine products · Support available for every order
                        </Text>
                    </View>

                    <View style={styles.placeWrap}>
                        <PrimaryButton
                            label={
                                placing
                                    ? 'Processing…'
                                    : paymentMethod === 'online'
                                      ? 'Pay securely with Razorpay'
                                      : 'Place order (COD)'
                            }
                            onPress={() => void placeOrder()}
                            loading={placing}
                            disabled={uploadingDoc || blockedAccount}
                        />
                        <Text style={styles.placeNote}>
                            {paymentMethod === 'online'
                                ? 'You will be taken to Razorpay to complete payment.'
                                : 'Pay the delivery partner in cash when your order arrives.'}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: spacing.xxl + 10 },
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    progressItem: { alignItems: 'center', gap: 5 },
    progressDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDotDone: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTick: { color: '#fff', fontSize: 11, fontWeight: '900' },
    progressDotActive: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressActiveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    progressDotText: { color: colors.textFaint, fontSize: 11, fontWeight: '800' },
    progressLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 18 },
    progressText: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
    progressActive: { color: colors.primary, fontWeight: '800' },
    warningCard: {
        flexDirection: 'row',
        gap: 9,
        marginHorizontal: spacing.lg,
        marginTop: 12,
        padding: 13,
        backgroundColor: colors.warningSoft,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningText: { flex: 1, fontSize: 11.5, color: colors.warning, lineHeight: 17 },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.lg },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg },
    sectionHelp: { fontSize: 11.5, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: 4, lineHeight: 16 },
    oncePill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    onceText: { fontSize: 9, fontWeight: '800', color: colors.primary },
    addrRow: { paddingHorizontal: spacing.lg, paddingTop: 12, gap: 10 },
    addrCard: {
        width: 210,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 2,
    },
    addrCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
    addrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    addrName: { flex: 1, fontSize: 12.5, fontWeight: '800', color: colors.text },
    addrLine: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
    defaultTag: { marginTop: 4, fontSize: 9, fontWeight: '800', color: colors.success },
    addrNew: {
        width: 130,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderStyle: 'dashed',
    },
    addrNewText: { fontSize: 11.5, fontWeight: '700', color: colors.primary },
    formCard: {
        marginHorizontal: spacing.lg,
        marginTop: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    card: {
        marginHorizontal: spacing.lg,
        marginTop: 10,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    docChips: { gap: 8, paddingBottom: 2 },
    docChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: 13,
        paddingVertical: 8,
        backgroundColor: colors.surface,
    },
    docChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
    docChipText: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
    docChipTextActive: { color: colors.primary },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
    docInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 13,
        paddingVertical: 11,
        fontSize: 14,
        color: colors.text,
        backgroundColor: '#FFFCFE',
    },
    docInput: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    fieldError: { fontSize: 10.5, color: colors.warning },
    uploadedNote: { fontSize: 11, color: colors.success, fontWeight: '600' },
    kycDone: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.successSoft,
        borderRadius: radius.md,
        padding: 13,
    },
    kycDoneTitle: { fontSize: 13, fontWeight: '800', color: colors.success },
    kycDoneSub: { fontSize: 11.5, color: colors.success, marginTop: 2 },
    payOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        marginHorizontal: spacing.lg,
        marginTop: 10,
        padding: 14,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    payOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
    payOptionDisabled: { opacity: 0.6 },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    payBody: { flex: 1 },
    payTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
    paySub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    payWarn: { fontSize: 10, color: colors.warning, marginTop: 2 },
    summaryCard: {
        marginHorizontal: spacing.lg,
        marginTop: 20,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    promoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginVertical: 8,
        backgroundColor: colors.successSoft,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    promoCode: { flex: 1, fontSize: 11.5, fontWeight: '800', color: colors.success, letterSpacing: 0.4 },
    promoValue: { fontSize: 11.5, fontWeight: '800', color: colors.success },
    secureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 26,
    },
    secureText: { flex: 1, fontSize: 10, color: colors.textFaint, textAlign: 'center' },
    placeWrap: { marginHorizontal: spacing.lg, marginTop: 16, gap: 8 },
    placeNote: { fontSize: 10.5, color: colors.textFaint, textAlign: 'center' },
});
