import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/src/lib/api';
import type { ProductSummary } from '@/src/lib/types';
import { ProductCard } from '@/src/components/ProductCard';
import { EmptyState } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { useRecentStore } from '@/src/store/recent';
import { colors, radius, spacing } from '@/src/theme/colors';

const SUGGESTIONS = ['Face cream', 'Serum', 'Shampoo', 'Hair colour', 'Kajal', 'Sunscreen'];

export default function SearchScreen() {
    const router = useRouter();
    const { show } = useToast();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const addToCart = useCartStore((s) => s.add);
    const searches = useRecentStore((s) => s.searches);
    const addSearch = useRecentStore((s) => s.addSearch);
    const clearSearches = useRecentStore((s) => s.clearSearches);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProductSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    /** Only the newest query may write results — a slow older reply must not win. */
    const requestSeq = useRef(0);

    useEffect(() => {
        const value = query.trim();
        if (value.length < 2) {
            requestSeq.current += 1;
            setResults([]);
            setSearched(false);
            setLoading(false);
            return;
        }

        const seq = ++requestSeq.current;

        // Paint a previous result for this exact word straight away.
        const cached = api.peekSearch(value);
        if (cached) {
            setResults(cached.items);
            setTotal(cached.total);
            setSearched(true);
            setLoading(false);
        }

        if (api.isSearchFresh(value) && cached) return;

        if (!cached) setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await api.searchProducts(value);
                if (seq !== requestSeq.current) return;
                setResults(res.items);
                setTotal(res.total);
                setSearched(true);
                addSearch(value);
            } catch (e: unknown) {
                if (seq !== requestSeq.current) return;
                show(e instanceof Error ? e.message : 'Search failed', 'error');
            } finally {
                if (seq === requestSeq.current) setLoading(false);
            }
        }, 320);
        return () => clearTimeout(timer);
    }, [query, addSearch, show]);

    const handleAdd = async (product: ProductSummary) => {
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
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>
                <View style={styles.inputWrap}>
                    <Ionicons name="search" size={18} color={colors.textFaint} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search cosmetics, brands, SKUs…"
                        placeholderTextColor={colors.textFaint}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {query.length > 0 ? (
                        <Pressable onPress={() => setQuery('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            {query.trim().length < 2 && !searched ? (
                <View style={styles.suggestions}>
                    {searches.length > 0 ? (
                        <>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionTitle}>Recent searches</Text>
                                <Pressable onPress={clearSearches} hitSlop={8}>
                                    <Text style={styles.clear}>Clear</Text>
                                </Pressable>
                            </View>
                            <View style={styles.chips}>
                                {searches.map((item) => (
                                    <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}>
                                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                                        <Text style={styles.chipText}>{item}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    ) : null}

                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Popular searches</Text>
                    </View>
                    <View style={styles.chips}>
                        {SUGGESTIONS.map((item) => (
                            <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}>
                                <Ionicons name="trending-up" size={13} color={colors.primary} />
                                <Text style={styles.chipText}>{item}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.tipCard}>
                        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                        <Text style={styles.tipText}>
                            Search by product name, brand, or SKU. Results update as you type.
                        </Text>
                    </View>
                </View>
            ) : loading ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
                <FlatList
                    data={results}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        results.length > 0 ? (
                            <Text style={styles.resultCount}>
                                {total.toLocaleString('en-IN')} result{total === 1 ? '' : 's'} for “{query.trim()}”
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title={`No products found for “${query.trim()}”`}
                            message="Try a shorter word, a brand name, or browse all products."
                            actionLabel="Browse all products"
                            onAction={() => router.push('/(tabs)/shop')}
                        />
                    }
                    renderItem={({ item }) => (
                        <View style={styles.cell}>
                            <ProductCard product={item} onAddToCart={handleAdd} compact />
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    backBtn: { padding: 6 },
    inputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        minHeight: 46,
    },
    input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
    suggestions: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 18,
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
    clear: { fontSize: 12, fontWeight: '700', color: colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    chipText: { fontSize: 12.5, color: colors.text, fontWeight: '600' },
    tipCard: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: colors.primaryFaint,
        borderRadius: radius.lg,
        padding: 14,
        marginTop: 26,
        borderWidth: 1,
        borderColor: '#F9DCE7',
    },
    tipText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    loader: { marginTop: 50 },
    list: { paddingHorizontal: spacing.md, paddingBottom: 28 },
    row: { gap: 10 },
    cell: { flex: 1, maxWidth: '50%', marginBottom: 10 },
    resultCount: { fontSize: 12, color: colors.textMuted, paddingVertical: 10, paddingHorizontal: 4 },
});
