import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    InteractionManager,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/lib/api';
import type { Category, HomeBootstrap, ProductSummary } from '@/src/lib/types';
import { ProductCard } from '@/src/components/ProductCard';
import { BannerCarousel } from '@/src/components/BannerCarousel';
import { FunnyLoader, ProductGridSkeleton, SectionHeader, Skeleton } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { formatPrice, resolveImageUrl } from '@/src/lib/format';
import { SHOPPING_OFFERS } from '@/src/lib/pricing';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { useRecentStore } from '@/src/store/recent';
import { useWishlistStore } from '@/src/store/wishlist';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function HomeScreen() {
    const router = useRouter();
    const { show } = useToast();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const addToCart = useCartStore((s) => s.add);
    const wishlistCount = useWishlistStore((s) => s.items.length);
    const recent = useRecentStore((s) => s.products);

    // Paint the last cached home screen instantly, then refresh in the background.
    const cached = api.peekHome(12, 12);
    const [data, setData] = useState<HomeBootstrap | null>(cached);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState<string | null>(null);

    const prefetched = useRef(false);

    const load = useCallback(async () => {
        try {
            setError(null);
            const res = await api.homeBootstrap(12, 12);
            setData(res);
            // Warm the shop tab once this screen is idle: it is one tab away and
            // its two endpoints take ~2s each when cold.
            if (!prefetched.current) {
                prefetched.current = true;
                InteractionManager.runAfterInteractions(() => api.prefetchShop());
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Could not load the store.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // A copy from the last few seconds is good enough — refetching it only
        // delays first paint and burns data.
        if (cached && api.isHomeFresh(12, 12)) {
            setLoading(false);
            return;
        }
        void load();
    }, [cached, load]);

    const handleAddToCart = useCallback(
        async (product: ProductSummary) => {
            if (!authenticated) {
                router.push('/login');
                return;
            }
            try {
                await addToCart(product.id, 1);
                show(`${product.name.slice(0, 28)} added to cart`);
            } catch (e: unknown) {
                show(e instanceof Error ? e.message : 'Could not add to cart', 'error');
            }
        },
        [addToCart, authenticated, router, show]
    );

    // Horizontal rows are virtualised so a 12-card row does not download 12
    // full-size images before the user ever scrolls it.
    const renderDeal = useCallback(
        ({ item }: { item: ProductSummary }) => (
            <View style={styles.dealCard}>
                <ProductCard product={item} onAddToCart={handleAddToCart} />
            </View>
        ),
        [handleAddToCart]
    );

    const renderRecent = useCallback(
        ({ item }: { item: ProductSummary }) => (
            <View style={styles.dealCard}>
                <ProductCard product={item} compact showWishlist={false} imagePriority="low" />
            </View>
        ),
        []
    );

    const renderCategory = useCallback(
        ({ item: cat }: { item: Category }) => (
            <Pressable
                style={styles.catItem}
                onPress={() =>
                    router.push({ pathname: '/(tabs)/shop', params: { category: cat.id } })
                }
            >
                <View style={styles.catImageWrap}>
                    {cat.image_url ? (
                        <Image
                            source={{ uri: resolveImageUrl(cat.image_url) }}
                            style={styles.catImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            priority="low"
                        />
                    ) : (
                        <Text style={styles.catLetter}>{cat.name.charAt(0)}</Text>
                    )}
                </View>
                <Text numberOfLines={2} style={styles.catName}>
                    {cat.name}
                </Text>
            </Pressable>
        ),
        [router]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.kicker}>PRANJAY</Text>
                        <Skeleton height={24} width={170} style={{ marginTop: 6 }} />
                    </View>
                </View>
                <Skeleton height={46} style={{ marginHorizontal: spacing.lg, borderRadius: 16 }} />
                <Skeleton height={150} style={{ margin: spacing.lg, borderRadius: radius.xl }} />
                <FunnyLoader compact label="Stocking the shelves" />
                <ProductGridSkeleton />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView
                style={styles.root}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            void load();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.kicker}>PRANJAY</Text>
                        <Text style={styles.title}>Beauty wholesale, made easy</Text>
                    </View>
                    <Pressable style={styles.iconBtn} onPress={() => router.push('/wishlist')}>
                        <Ionicons name="heart-outline" size={21} color={colors.primary} />
                        {wishlistCount > 0 ? (
                            <View style={styles.iconBadge}>
                                <Text style={styles.iconBadgeText}>{wishlistCount > 9 ? '9+' : wishlistCount}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>

                <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
                    <Ionicons name="search" size={18} color={colors.textFaint} />
                    <Text style={styles.searchPlaceholder}>Search products, brands, SKUs…</Text>
                </Pressable>

                {!authenticated ? (
                    <Pressable style={styles.guestCard} onPress={() => router.push('/login')}>
                        <View style={styles.guestIcon}>
                            <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.guestText}>
                            <Text style={styles.guestTitle}>Sign in with your mobile number</Text>
                            <Text style={styles.guestSub}>Track orders, save addresses and reorder faster.</Text>
                        </View>
                        <Text style={styles.guestArrow}>→</Text>
                    </Pressable>
                ) : null}

                {data?.banners && data.banners.length > 0 ? (
                    <View style={styles.bannerSection}>
                        <BannerCarousel banners={data.banners} />
                    </View>
                ) : null}

                <View style={styles.hero}>
                    <Text style={styles.heroKicker}>SALON &amp; RETAIL SUPPLIES</Text>
                    <Text style={styles.heroTitle}>Stock your shelves with India&apos;s trusted beauty brands.</Text>
                    <Text style={styles.heroSub}>
                        1,700+ products · Transparent pricing · Delivered across India
                    </Text>
                    <Pressable style={styles.heroCta} onPress={() => router.push('/(tabs)/shop')}>
                        <Text style={styles.heroCtaText}>Shop all products</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.primaryDeep} />
                    </Pressable>
                </View>

                <View style={styles.offerStrip}>
                    <Ionicons name="cube-outline" size={17} color={colors.primary} />
                    <Text style={styles.offerText}>
                        Free delivery on {formatPrice(SHOPPING_OFFERS.freeDeliveryFrom)}+ · Extra{' '}
                        {SHOPPING_OFFERS.bulkDiscountPercent}% off {formatPrice(SHOPPING_OFFERS.bulkDiscountFrom)}+
                    </Text>
                </View>

                {error ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>We could not load the store</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable style={styles.retryBtn} onPress={() => void load()}>
                            <Text style={styles.retryText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : null}

                {data?.categories && data.categories.length > 0 ? (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Shop by category"
                            action="View all"
                            onAction={() => router.push('/(tabs)/shop')}
                        />
                        <FlatList
                            horizontal
                            data={data.categories.slice(0, 12)}
                            keyExtractor={(item) => item.id}
                            renderItem={renderCategory}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.catRow}
                            initialNumToRender={5}
                            windowSize={3}
                            removeClippedSubviews
                        />
                    </View>
                ) : null}

                {data?.discounted && data.discounted.length > 0 ? (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Live deals"
                            action="Shop"
                            onAction={() => router.push('/(tabs)/shop')}
                        />
                        <FlatList
                            horizontal
                            data={data.discounted}
                            keyExtractor={(item) => item.id}
                            renderItem={renderDeal}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dealRow}
                            initialNumToRender={3}
                            windowSize={3}
                            removeClippedSubviews
                        />
                    </View>
                ) : null}

                {data?.featured && data.featured.length > 0 ? (
                    <View style={styles.section}>
                        <SectionHeader title="Featured for your business" />
                        <View style={styles.grid}>
                            {data.featured.map((item) => (
                                <View key={item.id} style={styles.gridItem}>
                                    <ProductCard
                                        product={item}
                                        onAddToCart={handleAddToCart}
                                        compact
                                        imagePriority="low"
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {recent.length > 0 ? (
                    <View style={styles.section}>
                        <SectionHeader title="Recently viewed" />
                        <FlatList
                            horizontal
                            data={recent.slice(0, 6)}
                            keyExtractor={(item) => item.id}
                            renderItem={renderRecent}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dealRow}
                            initialNumToRender={3}
                            windowSize={3}
                            removeClippedSubviews
                        />
                    </View>
                ) : null}

                <View style={styles.trust}>
                    {[
                        { icon: 'shield-checkmark-outline', title: 'Genuine products', sub: 'Sourced from verified brands' },
                        { icon: 'cube-outline', title: 'Fast dispatch', sub: 'Packed for quick delivery' },
                        { icon: 'headset-outline', title: 'Order support', sub: 'Help when you need it' },
                    ].map((item) => (
                        <View key={item.title} style={styles.trustItem}>
                            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
                            <Text style={styles.trustTitle}>{item.title}</Text>
                            <Text style={styles.trustSub}>{item.sub}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.footer}>Pranjay · B2B beauty marketplace</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    root: { flex: 1 },
    content: { paddingBottom: 28 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 6,
        paddingBottom: 12,
        gap: 12,
    },
    headerText: { flex: 1 },
    kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 2.4, color: colors.primary },
    title: { marginTop: 3, fontSize: 23, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 15,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    iconBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchPlaceholder: { color: colors.textFaint, fontSize: 14.5 },
    guestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: spacing.lg,
        marginTop: 12,
        backgroundColor: colors.primaryFaint,
        borderRadius: radius.lg,
        padding: 13,
        borderWidth: 1,
        borderColor: '#F9D6E4',
    },
    guestIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestText: { flex: 1 },
    guestTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
    guestSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
    guestArrow: { color: colors.primary, fontSize: 18, fontWeight: '800' },
    bannerSection: { marginTop: 14 },
    hero: {
        marginHorizontal: spacing.lg,
        marginTop: 14,
        borderRadius: radius.xl,
        padding: 22,
        backgroundColor: colors.primaryDeep,
    },
    heroKicker: { color: colors.accent, fontSize: 9.5, fontWeight: '900', letterSpacing: 2 },
    heroTitle: { marginTop: 9, fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30 },
    heroSub: { marginTop: 9, fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 18 },
    heroCta: {
        marginTop: 18,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: radius.pill,
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    heroCtaText: { color: colors.primaryDeep, fontWeight: '800', fontSize: 13 },
    offerStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: spacing.lg,
        marginTop: 12,
        backgroundColor: '#FFF4F8',
        borderRadius: radius.md,
        paddingVertical: 10,
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: '#F9DCE7',
    },
    offerText: { flex: 1, color: colors.primaryDark, fontSize: 11.5, fontWeight: '700' },
    errorCard: {
        margin: spacing.lg,
        padding: 16,
        borderRadius: radius.lg,
        backgroundColor: colors.dangerSoft,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorTitle: { fontWeight: '800', color: colors.danger, fontSize: 14 },
    errorText: { marginTop: 4, fontSize: 12.5, color: '#7F1D1D' },
    retryBtn: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.danger,
        borderRadius: 999,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    section: { marginTop: 25 },
    catRow: { paddingHorizontal: spacing.lg, gap: 14 },
    catItem: { width: 74, alignItems: 'center' },
    catImageWrap: {
        width: 66,
        height: 66,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catImage: { width: '100%', height: '100%' },
    catLetter: { fontSize: 22, fontWeight: '800', color: colors.primary },
    catName: { marginTop: 7, fontSize: 10.5, fontWeight: '600', textAlign: 'center', color: colors.text, lineHeight: 14 },
    dealRow: { paddingHorizontal: spacing.lg, gap: 12 },
    dealCard: { width: 156 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: 10 },
    gridItem: { width: '48%' },
    trust: {
        flexDirection: 'row',
        margin: spacing.lg,
        gap: 8,
        marginTop: 30,
    },
    trustItem: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    trustTitle: { fontSize: 11, fontWeight: '800', color: colors.text, marginTop: 2 },
    trustSub: { fontSize: 9.5, color: colors.textMuted, lineHeight: 13 },
    footer: { textAlign: 'center', fontSize: 10.5, color: colors.textFaint, marginTop: 6 },
});
