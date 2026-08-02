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
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/lib/api';
import type { Address, Cart } from '@/src/lib/types';
import { formatPrice } from '@/src/lib/format';
import { isRazorpayNativeAvailable, openRazorpayPayment, RAZORPAY_EXPO_GO_MESSAGE } from '@/src/lib/razorpay';
import { LoadingScreen, PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth';
import { colors } from '@/src/theme/colors';

const COD_PIN_CODES = new Set([
    '846001', '846002', '846003', '846004', '846005', '846008', '846009',
    '847101', '847103', '847104', '847105', '847121', '847201', '847239', '848213',
]);

function isCodAllowed(postalCode: string): boolean {
    const pin = postalCode.replace(/\D/g, '').slice(0, 6);
    return pin.length === 6 && COD_PIN_CODES.has(pin);
}

function buildCheckoutBase(
    cart: Cart,
    address: {
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2: string;
        city: string;
        state: string;
        postal_code: string;
    },
    selectedAddressId: string | null
) {
    const cartItems = cart.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
    }));

    const phone = address.phone.startsWith('+') ? address.phone : `+91${address.phone}`;

    const base = {
        full_name: address.full_name,
        phone,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: 'India',
        cart_items: cartItems,
    };

    return selectedAddressId ? { ...base, existing_address_id: selectedAddressId } : base;
}

function validateAddress(address: {
    full_name: string;
    phone: string;
    address_line1: string;
    city: string;
    postal_code: string;
}): boolean {
    if (!address.full_name || !address.phone || !address.address_line1 || !address.city || !address.postal_code) {
        Alert.alert('Address required', 'Please fill in delivery details.');
        return false;
    }
    return true;
}

export default function CheckoutScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [cart, setCart] = useState<Cart | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');

    const [address, setAddress] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone?.replace('+91', '') || '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: 'Bihar',
        postal_code: '',
    });

    useEffect(() => {
        void (async () => {
            try {
                const prep = await api.getCheckoutPrep();
                setCart(prep.cart);
                setAddresses(prep.addresses);
                const defaultAddr = prep.addresses.find((a) => a.is_default) || prep.addresses[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setAddress({
                        full_name: defaultAddr.full_name,
                        phone: defaultAddr.phone.replace('+91', ''),
                        address_line1: defaultAddr.address_line1,
                        address_line2: defaultAddr.address_line2 || '',
                        city: defaultAddr.city,
                        state: defaultAddr.state,
                        postal_code: defaultAddr.postal_code,
                    });
                }
            } catch (e: unknown) {
                Alert.alert('Checkout', e instanceof Error ? e.message : 'Could not load');
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    const codAllowed = isCodAllowed(address.postal_code);
    const razorpayReady = isRazorpayNativeAvailable();

    const showOrderSuccess = (orderId: string, orderNumber: string) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Order placed!', `Order #${orderNumber} confirmed.`, [
            { text: 'View order', onPress: () => router.replace(`/order/${orderId}`) },
            { text: 'Done', onPress: () => router.replace('/(tabs)/orders') },
        ]);
    };

    const placeOrder = async () => {
        if (!cart?.items.length) return;
        if (!validateAddress(address)) return;

        if (paymentMethod === 'cod') {
            if (!codAllowed) {
                Alert.alert('COD unavailable', 'Cash on delivery is available only for select PIN codes.');
                return;
            }
            setPlacing(true);
            try {
                const order = await api.completeCheckout({
                    ...buildCheckoutBase(cart, address, selectedAddressId),
                    payment_method: 'cod',
                });
                showOrderSuccess(order.id, order.order_number);
            } catch (e: unknown) {
                Alert.alert('Order failed', e instanceof Error ? e.message : 'Please try again');
            } finally {
                setPlacing(false);
            }
            return;
        }

        // Online — same flow as website: prepare → Razorpay SDK → complete
        if (!razorpayReady) {
            Alert.alert('Dev build required', RAZORPAY_EXPO_GO_MESSAGE);
            return;
        }

        setPlacing(true);
        try {
            const cartItems = cart.items.map((i) => ({
                product_id: i.product_id,
                quantity: i.quantity,
            }));

            const prep = await api.prepareCheckout({ cart_items: cartItems });

            setPlacing(false);

            const payment = await openRazorpayPayment({
                orderId: prep.razorpay_order_id,
                amountPaise: prep.amount_paise,
                description: `Order of ${cart.items_count} item${cart.items_count !== 1 ? 's' : ''}`,
                prefill: {
                    name: address.full_name,
                    email: user?.email || undefined,
                    contact: address.phone,
                },
            });

            setPlacing(true);
            const order = await api.completeCheckout({
                ...buildCheckoutBase(cart, address, selectedAddressId),
                payment_method: 'online',
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_signature: payment.razorpay_signature,
            });
            showOrderSuccess(order.id, order.order_number);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Payment cancelled or failed';
            if (!msg.toLowerCase().includes('cancel')) {
                Alert.alert('Payment failed', msg);
            }
        } finally {
            setPlacing(false);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <>
            <Stack.Screen options={{ title: 'Checkout' }} />
            <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <ScreenHeader title="Checkout" subtitle={`${cart?.items_count ?? 0} items · ${formatPrice(cart?.subtotal ?? 0)}`} />

                    {addresses.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Saved addresses</Text>
                            {addresses.map((addr) => (
                                <Pressable
                                    key={addr.id}
                                    style={[styles.addrCard, selectedAddressId === addr.id && styles.addrActive]}
                                    onPress={() => {
                                        setSelectedAddressId(addr.id);
                                        setAddress({
                                            full_name: addr.full_name,
                                            phone: addr.phone.replace('+91', ''),
                                            address_line1: addr.address_line1,
                                            address_line2: addr.address_line2 || '',
                                            city: addr.city,
                                            state: addr.state,
                                            postal_code: addr.postal_code,
                                        });
                                    }}
                                >
                                    <Text style={styles.addrName}>{addr.full_name}</Text>
                                    <Text style={styles.addrLine}>{addr.address_line1}, {addr.city}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery address</Text>
                        {(['full_name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code'] as const).map((field) => (
                            <TextInput
                                key={field}
                                style={styles.input}
                                placeholder={field.replace(/_/g, ' ')}
                                value={address[field]}
                                onChangeText={(t) => {
                                    setSelectedAddressId(null);
                                    setAddress((prev) => ({ ...prev, [field]: t }));
                                }}
                                keyboardType={field === 'phone' || field === 'postal_code' ? 'number-pad' : 'default'}
                            />
                        ))}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment</Text>
                        <Pressable
                            style={[styles.payOption, paymentMethod === 'online' && styles.payActive]}
                            onPress={() => setPaymentMethod('online')}
                        >
                            <Text style={styles.payTitle}>Pay online (UPI / card / netbanking)</Text>
                            <Text style={styles.payNote}>
                                {razorpayReady ? 'Secured by Razorpay' : 'Requires dev build on device (see IOS_SETUP.md)'}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.payOption, paymentMethod === 'cod' && styles.payActive]}
                            onPress={() => setPaymentMethod('cod')}
                        >
                            <Text style={styles.payTitle}>Cash on delivery</Text>
                            {!codAllowed && <Text style={styles.payNote}>Available in Bihar only</Text>}
                        </Pressable>
                    </View>

                    <View style={styles.footer}>
                        <PrimaryButton
                            label={paymentMethod === 'online' ? 'Pay with Razorpay' : 'Place order (COD)'}
                            onPress={placeOrder}
                            loading={placing}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingBottom: 40 },
    section: { marginHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: colors.text },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        backgroundColor: colors.surface,
        fontSize: 15,
    },
    addrCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        backgroundColor: colors.surface,
    },
    addrActive: { borderColor: colors.primary, backgroundColor: '#FFF0F5' },
    addrName: { fontWeight: '700', color: colors.text },
    addrLine: { marginTop: 4, fontSize: 13, color: colors.textMuted },
    payOption: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        backgroundColor: colors.surface,
    },
    payActive: { borderColor: colors.primary, backgroundColor: '#FFF0F5' },
    payTitle: { fontWeight: '700', color: colors.text },
    payNote: { marginTop: 4, fontSize: 12, color: colors.textMuted },
    footer: { marginHorizontal: 20 },
});
