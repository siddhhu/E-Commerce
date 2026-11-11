import { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import type { OrderSummary } from '@/src/lib/types';
import { formatPrice } from '@/src/lib/format';
import { Badge, EmptyState, FunnyLoader, LoadingScreen, ScreenHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { colors, radius, spacing } from '@/src/theme/colors';

const STATUS_FILTERS = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
    if (status === 'delivered') return 'success';
    if (status === 'cancelled') return 'danger';
    if (status === 'shipped' || status === 'processing') return 'primary';
    if (status === 'confirmed' || status === 'pending') return 'warning';
    return 'neutral';
}

export default function OrdersScreen() {
    const router = useRouter();
    const { show } = useToast();
    const hydrated = useAuthStore((s) => s.hydrated);
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));

    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(
        async (pageNum = 1, replace = true) => {
            if (!authenticated) {
                setOrders([]);
                setLoading(false);
                return;
            }
            try {
                if (pageNum === 1 && replace) setLoading(true);
                const res = await api.listOrders(pageNum, 20);
                const filtered = status
                    ? res.items.filter((order) => String(order.status) === status)
                    : res.items;
                setOrders((prev) => (replace ? filtered : [...prev, ...filtered]));
                setTotal(res.total);
                setPage(pageNum);
            } catch (e: unknown) {
                show(e instanceof Error ? e.message : 'Could not load orders', 'error');
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [authenticated, show, status]
    );

    useEffect(() => {
        if (hydrated) void load(1, true);
    }, [hydrated, load]);

    useFocusEffect(
        useCallback(() => {
            if (authenticated) void load(1, true);
        }, [authenticated, load])
    );

    if (!hydrated || (authenticated && loading && orders.length === 0)) {
        return <LoadingScreen label="Digging up your orders" />;
    }

    if (!authenticated) {
        return (
            <View style={styles.root}>
                <ScreenHeader title="Orders" subtitle="Track every delivery" />
                <EmptyState
                    title="Sign in to see your orders"
                    message="Order history, invoices and delivery updates appear here after you sign in."
                    actionLabel="Sign in with phone"
                    onAction={() => router.push('/login')}
                />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <ScreenHeader
                safe
                title="Orders"
                subtitle={`${total.toLocaleString('en-IN')} order${total === 1 ? '' : 's'}`}
            />

            {/* flexGrow: 0 keeps the filter row from stretching to the full screen height. */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filters}
            >
                {STATUS_FILTERS.map((item) => {
                    const active = status === item.value;
                    return (
                        <Pressable
                            key={item.label}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => setStatus(item.value)}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {orders.length === 0 && !loading ? (
                <EmptyState
                    title={status ? `No ${status} orders` : 'No orders yet'}
                    message="When you place an order it will appear here with live status updates."
                    actionLabel="Start shopping"
                    onAction={() => router.push('/(tabs)/shop')}
                />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void load(1, true);
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    onEndReached={() => {
                        if (loadingMore || orders.length >= total) return;
                        setLoadingMore(true);
                        void load(page + 1, false);
                    }}
                    onEndReachedThreshold={0.4}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
                        >
                            <View style={styles.cardTop}>
                                <View>
                                    <Text style={styles.orderNo}>#{item.order_number}</Text>
                                    <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                                </View>
                                <Badge label={String(item.status).replace(/_/g, ' ')} tone={statusTone(String(item.status))} />
                            </View>

                            {item.product_summary ? (
                                <Text numberOfLines={2} style={styles.summary}>
                                    {item.product_summary}
                                </Text>
                            ) : null}

                            <View style={styles.cardBottom}>
                                <Text style={styles.itemsCount}>
                                    {item.items_count ?? 0} item{(item.items_count ?? 0) === 1 ? '' : 's'} ·{' '}
                                    {String(item.payment_status ?? '').toUpperCase()}
                                </Text>
                                <View style={styles.amountRow}>
                                    <Text style={styles.amount}>{formatPrice(item.total_amount)}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                                </View>
                            </View>
                        </Pressable>
                    )}
                    ListFooterComponent={
                        loadingMore ? <FunnyLoader compact label="Fetching older orders" /> : null
                    }
                />
            )}
        </View>
    );
}

function formatDate(value: string) {
    try {
        return new Date(value).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return value;
    }
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    filterScroll: { flexGrow: 0, flexShrink: 0 },
    filters: { paddingHorizontal: spacing.lg, paddingBottom: 12, alignItems: 'center', gap: 8 },
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
    chipText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
    chipTextActive: { color: '#fff' },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 28 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    orderNo: { fontSize: 14.5, fontWeight: '800', color: colors.text },
    date: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
    summary: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    itemsCount: { fontSize: 10.5, color: colors.textFaint, textTransform: 'capitalize' },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    amount: { fontSize: 16, fontWeight: '900', color: colors.text },
    footerText: { textAlign: 'center', padding: 14, fontSize: 11.5, color: colors.textMuted },
});
