import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import type { Order } from '@/src/lib/types';
import { formatPrice } from '@/src/lib/format';
import { Badge, Divider, LoadingScreen, PrimaryButton } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useCartStore } from '@/src/store/cart';
import { colors, radius, spacing } from '@/src/theme/colors';
import { SUPPORT_EMAIL } from '@/src/config';

const TIMELINE = [
    { key: 'pending', label: 'Order placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
];

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { show } = useToast();
    const refreshCart = useCartStore((s) => s.refresh);

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            setOrder(await api.getOrder(id));
        } catch (e: unknown) {
            show(e instanceof Error ? e.message : 'Could not load this order', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, show]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !order) return <LoadingScreen label="Fetching your order" />;

    if (!order) {
        return (
            <View style={styles.root}>
                <Text style={styles.emptyTitle}>Order not found</Text>
                <Pressable style={styles.linkBtn} onPress={() => router.replace('/(tabs)/orders')}>
                    <Text style={styles.linkText}>Back to orders</Text>
                </Pressable>
            </View>
        );
    }

    const status = String(order.status);
    const cancelled = status === 'cancelled';
    const currentStep = TIMELINE.findIndex((step) => step.key === status);
    const address = order.shipping_address_data;

    const openInvoice = async () => {
        if (!order.invoice_url) return;
        try {
            await Linking.openURL(order.invoice_url);
        } catch {
            show('Could not open the invoice. Please try again.', 'error');
        }
    };

    const cancelOrder = () => {
        Alert.alert('Cancel this order?', 'The items will be returned to stock and your payment will be refunded as per policy.', [
            { text: 'Keep order', style: 'cancel' },
            {
                text: 'Cancel order',
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    try {
                        const updated = await api.cancelOrder(order.id);
                        setOrder(updated);
                        show('Order cancelled');
                    } catch (error) {
                        show(error instanceof Error ? error.message : 'Could not cancel this order', 'error');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    };

    const buyAgain = async () => {
        const items = (order.items ?? []).filter((item) => item.product_id && !item.is_cancelled);
        if (items.length === 0) {
            show('These products are no longer available', 'error');
            return;
        }
        setBusy(true);
        let added = 0;
        for (const item of items) {
            try {
                await api.addToCart(item.product_id as string, item.quantity);
                added += 1;
            } catch {
                /* product may be inactive now */
            }
        }
        await refreshCart().catch(() => undefined);
        setBusy(false);
        if (added === 0) {
            show('None of these products are available right now', 'error');
            return;
        }
        router.push('/(tabs)/cart');
    };

    return (
        <>
            <Stack.Screen options={{ title: `#${order.order_number}` }} />
            <ScrollView style={styles.root} contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <View style={styles.heroTop}>
                        <Badge
                            label={status.replace(/_/g, ' ')}
                            tone={cancelled ? 'danger' : status === 'delivered' ? 'success' : 'primary'}
                        />
                        <Text style={styles.heroDate}>{formatDate(order.created_at)}</Text>
                    </View>
                    <Text style={styles.heroTotal}>{formatPrice(order.total_amount)}</Text>
                    <Text style={styles.heroMeta}>
                        {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
                        {String(order.payment_method ?? '').toUpperCase()} ·{' '}
                        {String(order.payment_status ?? '').toUpperCase()}
                    </Text>
                </View>

                {!cancelled ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Delivery status</Text>
                        <View style={styles.timeline}>
                            {TIMELINE.map((step, index) => {
                                const active = index <= currentStep;
                                return (
                                    <View key={step.key} style={styles.timelineRow}>
                                        <View style={styles.timelineMarker}>
                                            <View style={[styles.dot, active && styles.dotActive]}>
                                                {active ? <Text style={styles.dotTick}>✓</Text> : null}
                                            </View>
                                            {index < TIMELINE.length - 1 ? (
                                                <View style={[styles.line, index < currentStep && styles.lineActive]} />
                                            ) : null}
                                        </View>
                                        <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.card, styles.cancelledCard]}>
                        <Text style={styles.cancelledTitle}>This order was cancelled</Text>
                        <Text style={styles.cancelledText}>
                            Any eligible refund is processed to the original payment method.
                        </Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Items</Text>
                    {(order.items ?? []).map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, item.is_cancelled && styles.strike]}>
                                    {item.product_name}
                                </Text>
                                <Text style={styles.itemMeta}>
                                    Qty {item.quantity} × {formatPrice(item.unit_price)}
                                    {item.is_cancelled ? ' · cancelled' : ''}
                                </Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatPrice(item.total_price)}</Text>
                        </View>
                    ))}
                </View>

                {address ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Delivery address</Text>
                        <Text style={styles.addressName}>{address.full_name}</Text>
                        <Text style={styles.addressLine}>{address.address_line1}</Text>
                        {address.address_line2 ? <Text style={styles.addressLine}>{address.address_line2}</Text> : null}
                        <Text style={styles.addressLine}>
                            {address.city}, {address.state} – {address.postal_code}
                        </Text>
                        <Text style={styles.addressPhone}>{address.phone}</Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment summary</Text>
                    <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                    {Number(order.discount_amount) > 0 ? (
                        <Row label="Discount" value={`− ${formatPrice(order.discount_amount)}`} positive />
                    ) : null}
                    <Row
                        label="Delivery"
                        value={Number(order.shipping_amount) === 0 ? 'FREE' : formatPrice(order.shipping_amount)}
                        positive={Number(order.shipping_amount) === 0}
                    />
                    {order.promo_code ? <Row label="Promo" value={order.promo_code} /> : null}
                    <Divider />
                    <Row label="Total paid" value={formatPrice(order.total_amount)} strong />
                </View>

                <View style={styles.actions}>
                    {order.invoice_url ? (
                        <PrimaryButton label="View invoice" variant="outline" onPress={() => void openInvoice()} />
                    ) : null}
                    <PrimaryButton label="Buy again" onPress={() => void buyAgain()} loading={busy} />
                    {['pending', 'confirmed', 'processing'].includes(status) ? (
                        <Pressable style={styles.cancelBtn} onPress={cancelOrder} disabled={busy}>
                            <Text style={styles.cancelText}>Cancel order</Text>
                        </Pressable>
                    ) : null}
                </View>

                <Pressable
                    style={styles.support}
                    onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Order ${order.order_number}`)}
                >
                    <Ionicons name="headset-outline" size={16} color={colors.primary} />
                    <Text style={styles.supportText}>Need help with this order? Contact support</Text>
                </Pressable>
            </ScrollView>
        </>
    );
}

function Row({
    label,
    value,
    positive,
    strong,
}: {
    label: string;
    value: string;
    positive?: boolean;
    strong?: boolean;
}) {
    return (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, strong && styles.strongLabel]}>{label}</Text>
            <Text style={[styles.rowValue, positive && styles.positive, strong && styles.strongValue]}>{value}</Text>
        </View>
    );
}

function formatDate(value: string) {
    try {
        return new Date(value).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: 40, gap: 12 },
    hero: { backgroundColor: colors.primaryDeep, borderRadius: radius.xl, padding: 20 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5 },
    heroTotal: { marginTop: 12, fontSize: 30, fontWeight: '900', color: '#fff' },
    heroMeta: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.72)' },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text, marginBottom: 2 },
    timeline: { gap: 0 },
    timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    timelineMarker: { alignItems: 'center', width: 22 },
    dot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotTick: { color: '#fff', fontSize: 11, fontWeight: '900' },
    line: { width: 2, height: 26, backgroundColor: colors.border },
    lineActive: { backgroundColor: colors.primary },
    timelineLabel: { fontSize: 13, color: colors.textFaint, paddingTop: 2 },
    timelineLabelActive: { color: colors.text, fontWeight: '700' },
    cancelledCard: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' },
    cancelledTitle: { fontWeight: '800', color: colors.danger, fontSize: 14 },
    cancelledText: { fontSize: 12.5, color: '#7F1D1D', lineHeight: 18 },
    itemRow: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
    strike: { textDecorationLine: 'line-through', color: colors.textFaint },
    itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
    itemTotal: { fontSize: 13.5, fontWeight: '800', color: colors.text },
    addressName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
    addressLine: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
    addressPhone: { fontSize: 12.5, color: colors.text, fontWeight: '600', marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    rowLabel: { fontSize: 13, color: colors.textMuted },
    rowValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
    positive: { color: colors.success },
    strongLabel: { fontWeight: '800', color: colors.text },
    strongValue: { fontSize: 17, fontWeight: '900', color: colors.primary },
    actions: { gap: 10, marginTop: 4 },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
    support: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    supportText: { fontSize: 11.5, color: colors.textMuted },
    emptyTitle: { textAlign: 'center', marginTop: 60, fontSize: 17, fontWeight: '800', color: colors.text },
    linkBtn: { alignSelf: 'center', marginTop: 12, padding: 10 },
    linkText: { color: colors.primary, fontWeight: '700' },
});
