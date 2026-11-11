import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import { formatPrice, resolveImageUrl } from '@/src/lib/format';
import type { CartItem } from '@/src/lib/types';
import { EmptyState, LoadingScreen, PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { PriceBreakdown } from '@/src/components/PriceBreakdown';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function CartScreen() {
    const router = useRouter();
    const { show } = useToast();
    const hydrated = useAuthStore((s) => s.hydrated);
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));

    const cart = useCartStore((s) => s.cart);
    const loading = useCartStore((s) => s.loading);
    const promo = useCartStore((s) => s.promo);
    const refresh = useCartStore((s) => s.refresh);
    const setQuantity = useCartStore((s) => s.setQuantity);
    const remove = useCartStore((s) => s.remove);
    const applyPromo = useCartStore((s) => s.applyPromo);
    const clearPromo = useCartStore((s) => s.clearPromo);

    const [refreshing, setRefreshing] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);

    useEffect(() => {
        if (authenticated) void refresh().catch(() => undefined);
    }, [authenticated, refresh]);

    // Warm addresses + cart for checkout while the user is still shopping the cart.
    useEffect(() => {
        if (authenticated) api.warmCheckout();
    }, [authenticated, cart.items_count]);

    const changeQuantity = async (item: CartItem, next: number) => {
        try {
            await setQuantity(item, next);
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not update quantity', 'error');
        }
    };

    const confirmRemove = (item: CartItem) => {
        Alert.alert('Remove item?', item.product_name, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await remove(item);
                        show('Item removed from cart', 'info');
                    } catch (error) {
                        show(error instanceof Error ? error.message : 'Could not remove item', 'error');
                    }
                },
            },
        ]);
    };

    const handleApplyPromo = async () => {
        const code = promoInput.trim();
        if (!code) {
            show('Enter a promo code first', 'info');
            return;
        }
        setApplyingPromo(true);
        try {
            const applied = await applyPromo(code);
            setPromoInput('');
            show(`${applied.code} applied · you save ${formatPrice(applied.discount)}`);
        } catch (error) {
            show(error instanceof Error ? error.message : 'This promo code is not valid', 'error');
        } finally {
            setApplyingPromo(false);
        }
    };

    if (!hydrated || (authenticated && loading && cart.items.length === 0)) return <LoadingScreen />;

    if (!authenticated) {
        return (
            <SafeAreaView style={styles.root} edges={['top']}>
                <ScreenHeader title="Cart" subtitle="Sign in to sync your cart" />
                <EmptyState
                    title="Your cart is waiting"
                    message="Sign in with your mobile number to keep your cart, addresses and orders in one place."
                    actionLabel="Sign in with phone"
                    onAction={() => router.push('/login')}
                />
            </SafeAreaView>
        );
    }

    if (cart.items.length === 0) {
        return (
            <SafeAreaView style={styles.root} edges={['top']}>
                <ScreenHeader title="Cart" />
                <EmptyState
                    title="Your cart is empty"
                    message="Browse salon and beauty essentials and add what your business needs."
                    actionLabel="Start shopping"
                    onAction={() => router.push('/(tabs)/shop')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScreenHeader
                title="Cart"
                subtitle={`${cart.items_count} item${cart.items_count === 1 ? '' : 's'} · ${formatPrice(cart.subtotal)}`}
            />
            <FlatList
                data={cart.items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            void refresh()
                                .catch(() => show('Could not refresh cart', 'error'))
                                .finally(() => setRefreshing(false));
                        }}
                        tintColor={colors.primary}
                    />
                }
                renderItem={({ item }) => {
                    const image = resolveImageUrl(item.primary_image);
                    return (
                        <View style={styles.item}>
                            <Pressable
                                style={styles.thumb}
                                onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.product_slug } })}
                            >
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.thumbImg} contentFit="contain" />
                                ) : (
                                    <Text style={styles.imageFallback}>{item.product_name.charAt(0)}</Text>
                                )}
                            </Pressable>

                            <View style={styles.itemBody}>
                                <Text numberOfLines={2} style={styles.itemName}>
                                    {item.product_name}
                                </Text>
                                <Text style={styles.unitPrice}>
                                    {formatPrice(item.unit_price)} <Text style={styles.unit}>each</Text>
                                </Text>

                                <View style={styles.bottomRow}>
                                    <View style={styles.stepper}>
                                        <Pressable style={styles.stepBtn} onPress={() => void changeQuantity(item, item.quantity - 1)}>
                                            <Ionicons
                                                name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                                                size={15}
                                                color={colors.primary}
                                            />
                                        </Pressable>
                                        <Text style={styles.qty}>{item.quantity}</Text>
                                        <Pressable style={styles.stepBtn} onPress={() => void changeQuantity(item, item.quantity + 1)}>
                                            <Ionicons name="add" size={15} color={colors.primary} />
                                        </Pressable>
                                    </View>
                                    <Text style={styles.lineTotal}>{formatPrice(item.total_price)}</Text>
                                </View>
                            </View>
                        </View>
                    );
                }}
                ListFooterComponent={
                    <View style={styles.footer}>
                        <View style={styles.promoCard}>
                            <Text style={styles.promoTitle}>Have a promo code?</Text>
                            {promo ? (
                                <View style={styles.appliedRow}>
                                    <View>
                                        <Text style={styles.appliedCode}>{promo.code}</Text>
                                        <Text style={styles.appliedSave}>You save {formatPrice(promo.discount)}</Text>
                                    </View>
                                    <Pressable onPress={() => { clearPromo(); show('Promo removed', 'info'); }} hitSlop={8}>
                                        <Text style={styles.removePromo}>Remove</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.promoRow}>
                                    <TextInput
                                        style={styles.promoInput}
                                        placeholder="Enter code"
                                        placeholderTextColor={colors.textFaint}
                                        autoCapitalize="characters"
                                        value={promoInput}
                                        onChangeText={(text) => setPromoInput(text.toUpperCase())}
                                        onSubmitEditing={() => void handleApplyPromo()}
                                    />
                                    <Pressable style={styles.applyBtn} onPress={() => void handleApplyPromo()} disabled={applyingPromo}>
                                        <Text style={styles.applyText}>{applyingPromo ? '…' : 'Apply'}</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        <View style={styles.summaryCard}>
                            <PriceBreakdown subtotal={cart.subtotal} promoDiscount={promo?.discount ?? 0} />
                        </View>

                        <PrimaryButton label="Proceed to checkout" onPress={() => router.push('/checkout')} />

                        <Pressable style={styles.continueBtn} onPress={() => router.push('/(tabs)/shop')}>
                            <Ionicons name="arrow-back" size={15} color={colors.primary} />
                            <Text style={styles.continueText}>Continue shopping</Text>
                        </Pressable>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
    item: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    thumb: {
        width: 84,
        height: 84,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbImg: { width: '100%', height: '100%' },
    imageFallback: { fontSize: 26, fontWeight: '800', color: colors.primary },
    itemBody: { flex: 1, justifyContent: 'space-between' },
    itemName: { fontSize: 13.5, fontWeight: '600', color: colors.text, lineHeight: 18 },
    unitPrice: { marginTop: 4, fontSize: 14.5, fontWeight: '800', color: colors.primary },
    unit: { fontSize: 10.5, fontWeight: '500', color: colors.textFaint },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        overflow: 'hidden',
    },
    stepBtn: { width: 32, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFaint },
    qty: { minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: '800', color: colors.text },
    lineTotal: { fontSize: 14, fontWeight: '800', color: colors.text },
    footer: { marginTop: 12, gap: 12 },
    promoCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    promoTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
    promoRow: { flexDirection: 'row', gap: 8 },
    promoInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 13,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.text,
        backgroundColor: '#FFFCFE',
    },
    applyBtn: {
        backgroundColor: colors.primaryDeep,
        borderRadius: radius.md,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    appliedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.successSoft,
        borderRadius: radius.md,
        padding: 12,
    },
    appliedCode: { fontSize: 14, fontWeight: '900', color: colors.success, letterSpacing: 0.5 },
    appliedSave: { fontSize: 11.5, color: colors.success, marginTop: 2 },
    removePromo: { color: colors.danger, fontWeight: '700', fontSize: 12 },
    summaryCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    continueText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
