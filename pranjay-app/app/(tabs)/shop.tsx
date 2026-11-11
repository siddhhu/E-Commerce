import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import type { Category, ProductSummary } from '@/src/lib/types';
import { ProductCard } from '@/src/components/ProductCard';
import { Chip, EmptyState, FunnyLoader, LoadingScreen, ScreenHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { colors, radius, spacing } from '@/src/theme/colors';
import { formatPrice } from '@/src/lib/format';

interface ShopFilters {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minDiscount?: number;
    inStock?: boolean;
}

const PRICE_FILTERS = [
    { label: 'Under ₹100', min: undefined, max: 100 },
    { label: '₹100 – ₹300', min: 100, max: 300 },
    { label: '₹300 – ₹700', min: 300, max: 700 },
    { label: '₹700+', min: 700, max: undefined },
];

const DISCOUNT_FILTERS = [0, 10, 20, 30, 50];

/** Stable param shape so cached pages and live pages always share a key. */
function buildParams(filters: ShopFilters, page: number) {
    return {
        page,
        page_size: 20,
        category_id: filters.category,
        brand_id: filters.brand,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        min_discount: filters.minDiscount,
        in_stock: filters.inStock,
    };
}

const pageKey = (filters: ShopFilters) => JSON.stringify(buildParams(filters, 1));

export default function ShopScreen() {
    const router = useRouter();
    const { show } = useToast();
    const { category } = useLocalSearchParams<{ category?: string }>();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const addToCart = useCartStore((s) => s.add);

    const cachedMeta = api.peekCatalogMeta();
    const cachedPage = api.peekProducts(buildParams({ category }, 1));

    const [products, setProducts] = useState<ProductSummary[]>(cachedPage?.items ?? []);
    const [categories, setCategories] = useState<Category[]>(cachedMeta?.categories.filter((c) => c.is_active) ?? []);
    const [brands, setBrands] = useState<Array<{ id: string; name: string }>>(cachedMeta?.brands.slice(0, 20) ?? []);
    const [filters, setFilters] = useState<ShopFilters>({ category });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(cachedPage?.total ?? 0);
    const [loading, setLoading] = useState(!cachedPage);
    const [loadedKey, setLoadedKey] = useState(cachedPage ? pageKey({ category }) : null);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, category }));
    }, [category]);

    const activeFilterCount = useMemo(
        () =>
            [filters.brand, filters.minPrice, filters.maxPrice, filters.minDiscount, filters.inStock].filter(
                (value) => value !== undefined && value !== false
            ).length,
        [filters]
    );

    const load = useCallback(
        async (pageNum = 1, replace = true) => {
            const params = buildParams(filters, pageNum);
            // Filter metadata is a separate, session-cached request. Firing it in
            // the background keeps it from delaying the product grid, which is
            // what the user is actually waiting to see.
            void api
                .catalogMeta()
                .then((meta) => {
                    setCategories(meta.categories.filter((item) => item.is_active));
                    setBrands(meta.brands.slice(0, 20));
                })
                .catch(() => undefined);

            try {
                const res = await api.listProducts(params);
                setTotal(res.total);
                setProducts((prev) => (replace ? res.items : [...prev, ...res.items]));
                setPage(pageNum);
                if (pageNum === 1) setLoadedKey(pageKey(filters));
            } catch (e: unknown) {
                show(e instanceof Error ? e.message : 'Failed to load products', 'error');
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [filters, show]
    );

    useEffect(() => {
        const key = pageKey(filters);
        // Re-entering the tab on a page fetched seconds ago must not re-query.
        if (key === loadedKey && api.isProductsFresh(buildParams(filters, 1))) {
            setLoading(false);
            return;
        }
        setLoading(true);
        void load(1, true);
    }, [filters, load, loadedKey]);

    const handleAdd = useCallback(
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
        [authenticated, addToCart, router, show]
    );

    const renderItem = useCallback(
        ({ item }: { item: ProductSummary }) => (
            <View style={styles.cell}>
                <ProductCard product={item} onAddToCart={handleAdd} compact />
            </View>
        ),
        [handleAdd]
    );

    const selectedCategoryName = categories.find((item) => item.id === filters.category)?.name ?? 'All products';

    if (loading && products.length === 0) return <LoadingScreen label="Opening the shop" />;

    return (
        <View style={styles.root}>
            <ScreenHeader
                safe
                title="Shop"
                subtitle={
                    loading
                        ? 'Updating products…'
                        : `${total.toLocaleString('en-IN')} products${filters.category ? ` · ${selectedCategoryName}` : ''}`
                }
                right={
                    <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen(true)}>
                        <Ionicons name="options-outline" size={18} color={colors.primary} />
                        {activeFilterCount > 0 ? (
                            <View style={styles.filterCount}>
                                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                }
            />

            <FlatList
                data={products}
                numColumns={2}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.list}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={7}
                removeClippedSubviews
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
                    if (loadingMore || loading || products.length >= total) return;
                    setLoadingMore(true);
                    void load(page + 1, false);
                }}
                onEndReachedThreshold={0.6}
                ListHeaderComponent={
                    <View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                            contentContainerStyle={styles.chips}
                        >
                            <Chip
                                label="All"
                                active={!filters.category}
                                onPress={() => setFilters((prev) => ({ ...prev, category: undefined }))}
                            />
                            {categories.map((item) => (
                                <Chip
                                    key={item.id}
                                    label={item.name}
                                    active={filters.category === item.id}
                                    onPress={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            category: prev.category === item.id ? undefined : item.id,
                                        }))
                                    }
                                />
                            ))}
                        </ScrollView>

                        {activeFilterCount > 0 ? (
                            <View style={styles.activeRow}>
                                <Text style={styles.activeText}>
                                    {filters.brand
                                        ? brands.find((b) => b.id === filters.brand)?.name ?? 'Brand filter'
                                        : ''}
                                    {filters.brand && (filters.minPrice || filters.maxPrice) ? ' · ' : ''}
                                    {filters.minPrice || filters.maxPrice
                                        ? `${formatPrice(filters.minPrice ?? 0)} – ${filters.maxPrice ? formatPrice(filters.maxPrice) : 'any'}`
                                        : ''}
                                    {filters.minDiscount ? ` · ${filters.minDiscount}%+ off` : ''}
                                    {filters.inStock ? ' · In stock' : ''}
                                </Text>
                                <Pressable onPress={() => setFilters({ category: filters.category })}>
                                    <Text style={styles.clearText}>Clear</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </View>
                }
                renderItem={renderItem}
                ListEmptyComponent={
                    <EmptyState
                        title="No products match these filters"
                        message="Try a different category or clear the filters."
                        actionLabel="Clear filters"
                        onAction={() => setFilters({})}
                    />
                }
                ListFooterComponent={
                    loadingMore ? (
                        <FunnyLoader compact label="Fetching more products" />
                    ) : products.length > 0 && products.length >= total ? (
                        <Text style={styles.endText}>You have seen all {total.toLocaleString('en-IN')} products</Text>
                    ) : null
                }
            />

            <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setFiltersOpen(false)}>
                    <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Filters</Text>
                            <Pressable onPress={() => setFiltersOpen(false)} hitSlop={10}>
                                <Text style={styles.done}>Done</Text>
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.groupTitle}>Price</Text>
                            <View style={styles.wrapRow}>
                                {PRICE_FILTERS.map((item) => {
                                    const active =
                                        filters.minPrice === item.min && filters.maxPrice === item.max;
                                    return (
                                        <Chip
                                            key={item.label}
                                            label={item.label}
                                            active={active}
                                            onPress={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    minPrice: active ? undefined : item.min,
                                                    maxPrice: active ? undefined : item.max,
                                                }))
                                            }
                                        />
                                    );
                                })}
                            </View>

                            <Text style={styles.groupTitle}>Minimum discount</Text>
                            <View style={styles.wrapRow}>
                                {DISCOUNT_FILTERS.map((value) => (
                                    <Chip
                                        key={value}
                                        label={value === 0 ? 'Any' : `${value}%+`}
                                        active={(filters.minDiscount ?? 0) === value}
                                        onPress={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                minDiscount: value === 0 ? undefined : value,
                                            }))
                                        }
                                    />
                                ))}
                            </View>

                            <Text style={styles.groupTitle}>Brand</Text>
                            <ScrollView style={styles.brandList} nestedScrollEnabled>
                                <View style={styles.wrapRow}>
                                    <Chip
                                        label="All brands"
                                        active={!filters.brand}
                                        onPress={() => setFilters((prev) => ({ ...prev, brand: undefined }))}
                                    />
                                    {brands.map((brand) => (
                                        <Chip
                                            key={brand.id}
                                            label={brand.name}
                                            active={filters.brand === brand.id}
                                            onPress={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    brand: prev.brand === brand.id ? undefined : brand.id,
                                                }))
                                            }
                                        />
                                    ))}
                                </View>
                            </ScrollView>

                            <View style={styles.stockRow}>
                                <View style={styles.stockText}>
                                    <Text style={styles.groupTitle}>In stock only</Text>
                                    <Text style={styles.stockHint}>Hide products that are unavailable</Text>
                                </View>
                                <Switch
                                    value={Boolean(filters.inStock)}
                                    onValueChange={(value) => setFilters((prev) => ({ ...prev, inStock: value || undefined }))}
                                    trackColor={{ true: colors.primary, false: '#E5E7EB' }}
                                    thumbColor="#fff"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <View style={styles.footerItem}>
                                <Pressable
                                    style={styles.resetBtn}
                                    onPress={() => setFilters({ category: filters.category })}
                                >
                                    <Text style={styles.resetText}>Reset</Text>
                                </Pressable>
                            </View>
                            <View style={styles.footerItem}>
                                <Pressable style={styles.applyBtn} onPress={() => setFiltersOpen(false)}>
                                    <Text style={styles.applyText}>
                                        Show {total > 0 ? `${total.toLocaleString('en-IN')} products` : 'products'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    filterBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCount: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 15,
        height: 15,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCountText: { color: '#fff', fontSize: 8, fontWeight: '800' },
    chipScroll: { flexGrow: 0 },
    chips: { paddingHorizontal: spacing.lg, paddingBottom: 12 },
    list: { paddingHorizontal: spacing.md, paddingBottom: 28 },
    row: { gap: 10 },
    cell: { flex: 1, maxWidth: '50%', marginBottom: 10 },
    activeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: 10,
        gap: 8,
    },
    activeText: { flex: 1, fontSize: 11.5, color: colors.textMuted },
    clearText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    endText: { textAlign: 'center', padding: 18, color: colors.textFaint, fontSize: 11.5 },
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '84%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
    done: { color: colors.primary, fontWeight: '800' },
    sheetBody: { padding: spacing.xl, gap: 4 },
    groupTitle: { marginTop: 14, marginBottom: 8, fontSize: 13.5, fontWeight: '800', color: colors.text },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    brandList: { maxHeight: 200 },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    stockText: { flex: 1 },
    stockHint: { fontSize: 11.5, color: colors.textMuted, marginTop: -2 },
    sheetFooter: {
        flexDirection: 'row',
        gap: 10,
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerItem: { flex: 1 },
    resetBtn: {
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: radius.md,
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetText: { color: colors.primary, fontWeight: '800' },
    applyBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: { color: '#fff', fontWeight: '800' },
});
