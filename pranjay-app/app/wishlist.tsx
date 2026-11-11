import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import type { WishlistItem } from '@/src/lib/types';
import { formatPrice, resolveImageUrl } from '@/src/lib/format';
import { discountPercent } from '@/src/lib/format';
import { EmptyState, LoadingScreen } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { useWishlistStore } from '@/src/store/wishlist';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function WishlistScreen() {
    const router = useRouter();
    const { show } = useToast();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const items = useWishlistStore((s) => s.items);
    const loading = useWishlistStore((s) => s.loading);
    const load = useWishlistStore((s) => s.load);
    const removeItem = useWishlistStore((s) => s.removeItem);
    const moveToCart = useWishlistStore((s) => s.moveToCart);
    const refreshCart = useCartStore((s) => s.refresh);

    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (authenticated) void load(true);
        }, [authenticated, load])
    );

    const handleMove = async (item: WishlistItem) => {
        try {
            await moveToCart(item.id);
            await refreshCart();
            show(`${item.product_name.slice(0, 26)} moved to cart`);
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not move to cart', 'error');
        }
    };

    const handleRemove = (item: WishlistItem) => {
        Alert.alert('Remove from wishlist?', item.product_name, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await removeItem(item.id);
                        show('Removed from wishlist', 'info');
                    } catch (error) {
                        show(error instanceof Error ? error.message : 'Could not remove item', 'error');
                    }
                },
            },
        ]);
    };

    if (!authenticated) {
        return (
            <View style={styles.root}>
                <EmptyState
                    title="Sign in to save favourites"
                    message="Your wishlist follows you across the app and website."
                    actionLabel="Sign in with phone"
                    onAction={() => router.push('/login')}
                />
            </View>
        );
    }

    if (loading && items.length === 0) return <LoadingScreen label="Gathering your saved picks" />;

    return (
        <View style={styles.root}>
            {items.length === 0 ? (
                <EmptyState
                    title="No saved items yet"
                    message="Tap the heart on any product to keep it here for later."
                    actionLabel="Browse products"
                    onAction={() => router.push('/(tabs)/shop')}
                />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void load(true).finally(() => setRefreshing(false));
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    renderItem={({ item }) => {
                        const image = resolveImageUrl(item.primary_image);
                        const pct = discountPercent(item.mrp, item.selling_price);
                        return (
                            <View style={styles.card}>
                                <Pressable
                                    style={styles.thumb}
                                    onPress={() =>
                                        router.push({ pathname: '/product/[slug]', params: { slug: item.product_slug } })
                                    }
                                >
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.thumbImg} contentFit="contain" />
                                    ) : (
                                        <Text style={styles.fallback}>{item.product_name.charAt(0)}</Text>
                                    )}
                                </Pressable>
                                <View style={styles.body}>
                                    <Pressable
                                        onPress={() =>
                                            router.push({ pathname: '/product/[slug]', params: { slug: item.product_slug } })
                                        }
                                    >
                                        <Text numberOfLines={2} style={styles.name}>
                                            {item.product_name}
                                        </Text>
                                    </Pressable>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.price}>{formatPrice(item.selling_price)}</Text>
                                        {item.mrp > item.selling_price ? (
                                            <Text style={styles.mrp}>{formatPrice(item.mrp)}</Text>
                                        ) : null}
                                        {pct > 0 ? <Text style={styles.pct}>{pct}% off</Text> : null}
                                    </View>
                                    <Text style={[styles.stock, !item.is_in_stock && styles.out]}>
                                        {item.is_in_stock ? 'In stock' : 'Out of stock'}
                                    </Text>
                                    <View style={styles.actions}>
                                        <Pressable
                                            style={[styles.moveBtn, !item.is_in_stock && styles.moveDisabled]}
                                            disabled={!item.is_in_stock}
                                            onPress={() => void handleMove(item)}
                                        >
                                            <Ionicons name="bag-add-outline" size={14} color="#fff" />
                                            <Text style={styles.moveText}>Move to cart</Text>
                                        </Pressable>
                                        <Pressable style={styles.removeBtn} onPress={() => handleRemove(item)} hitSlop={6}>
                                            <Ionicons name="heart-dislike-outline" size={16} color={colors.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.lg },
    card: {
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
        width: 92,
        height: 92,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbImg: { width: '100%', height: '100%' },
    fallback: { fontSize: 30, fontWeight: '800', color: colors.primary },
    body: { flex: 1 },
    name: { fontSize: 13.5, fontWeight: '600', color: colors.text, lineHeight: 18 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
    price: { fontSize: 16, fontWeight: '900', color: colors.text },
    mrp: { fontSize: 11.5, color: colors.textFaint, textDecorationLine: 'line-through' },
    pct: { fontSize: 10, fontWeight: '800', color: colors.success },
    stock: { fontSize: 10.5, fontWeight: '700', color: colors.success, marginTop: 3 },
    out: { color: colors.danger },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    moveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: colors.primary,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    moveDisabled: { opacity: 0.45 },
    moveText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.dangerSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
