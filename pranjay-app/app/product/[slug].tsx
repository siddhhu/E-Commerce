import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/src/lib/api';
import type { Product, ProductSummary } from '@/src/lib/types';
import { discountPercent, formatPrice, resolveImageUrl } from '@/src/lib/format';
import { SHOPPING_OFFERS } from '@/src/lib/pricing';
import { ImageGallery } from '@/src/components/ImageGallery';
import { ProductCard } from '@/src/components/ProductCard';
import { EmptyState, LoadingScreen, PrimaryButton, SectionHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { useRecentStore } from '@/src/store/recent';
import { useWishlistStore } from '@/src/store/wishlist';
import { peekProductPreview, productFromSummary } from '@/src/lib/productPreview';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function ProductDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const { show } = useToast();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const addToCart = useCartStore((s) => s.add);
    const toggleWishlist = useWishlistStore((s) => s.toggle);
    const addRecent = useRecentStore((s) => s.addProduct);

    // Paint from the tapped card (or a session-cached detail) immediately; the
    // request then fills in description, gallery and variants.
    const seeded = (slug ? api.peekProductDetail(slug) : null) ?? null;
    const preview = seeded ? null : peekProductPreview(slug);
    const initialProduct = seeded?.product ?? (preview ? productFromSummary(preview) : null);

    const [product, setProduct] = useState<Product | null>(initialProduct);
    const [productId, setProductId] = useState(initialProduct?.id ?? '');
    const wished = useWishlistStore((s) => s.items.some((item) => item.product_id === productId));
    const [variants, setVariants] = useState<ProductSummary[]>(seeded?.variants ?? []);
    const [related, setRelated] = useState<ProductSummary[]>(seeded?.related ?? []);
    const [quantity, setQuantity] = useState(Math.max(1, initialProduct?.min_order_quantity || 1));
    const [loading, setLoading] = useState(!initialProduct);
    const hasContent = useRef(Boolean(initialProduct));
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [buying, setBuying] = useState(false);

    const load = useCallback(async () => {
        if (!slug) return;
        if (!hasContent.current) setLoading(true);
        setError(null);
        try {
            const res = await api.productDetail(slug);
            setProduct(res.product);
            setProductId(res.product.id);
            setVariants(res.variants);
            setRelated(res.related);
            if (!hasContent.current) {
                setQuantity(Math.max(1, res.product.min_order_quantity || 1));
            } else {
                // Tapping another variant reuses this screen, so a quantity that
                // was legal for the old product must be clamped to the new one.
                const min = Math.max(1, res.product.min_order_quantity || 1);
                const max = Math.max(min, res.product.stock_quantity);
                setQuantity((current) => Math.min(Math.max(min, current), max));
            }
            hasContent.current = true;
            addRecent(res.product);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'This product could not be loaded.';
            setError(message);
            if (hasContent.current) show(`Showing what we have · ${message}`, 'info');
        } finally {
            setLoading(false);
        }
    }, [slug, addRecent, show]);

    useEffect(() => {
        // A detail fetched in the last five minutes is served from cache so the
        // screen opens instantly; pull-to-refresh isn't needed for a catalogue.
        if (slug && api.isProductDetailFresh(slug) && seeded) {
            setLoading(false);
            return;
        }
        void load();
    }, [load, slug, seeded]);

    const outOfStock = !product || product.stock_quantity <= 0;
    const pct = product ? discountPercent(product.mrp, product.selling_price) : 0;
    const images = product
        ? [
              ...product.images.map((image) => resolveImageUrl(image.image_url)),
              ...(product.image_url ? [resolveImageUrl(product.image_url)] : []),
          ].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)
        : [];

    const addItem = async (openCheckout = false) => {
        if (!product) return;
        if (!authenticated) {
            router.push('/login');
            return;
        }
        if (openCheckout) setBuying(true);
        else setAdding(true);
        try {
            await addToCart(product.id, quantity);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (openCheckout) router.push('/checkout');
            else show(`${quantity} × ${product.name.slice(0, 24)} added to cart`);
        } catch (e: unknown) {
            show(e instanceof Error ? e.message : 'Could not add to cart', 'error');
        } finally {
            setAdding(false);
            setBuying(false);
        }
    };

    const handleWishlist = async () => {
        if (!product) return;
        if (!authenticated) {
            router.push('/login');
            return;
        }
        try {
            const added = await toggleWishlist(product.id);
            show(added ? 'Saved to wishlist' : 'Removed from wishlist', added ? 'success' : 'info');
        } catch (e: unknown) {
            show(e instanceof Error ? e.message : 'Could not update wishlist', 'error');
        }
    };

    const shareProduct = async () => {
        if (!product) return;
        await Share.share({
            message: `${product.name} — ${formatPrice(product.selling_price)} on Pranjay\nhttps://www.pranjay.com/products/${product.slug}`,
        });
    };

    if (loading && !product) return <LoadingScreen label="Unboxing this product" />;

    if (!product) {
        return (
            <View style={styles.root}>
                <EmptyState
                    title="Product unavailable"
                    message={error ?? 'This product may have been removed.'}
                    actionLabel="Try again"
                    onAction={() => void load()}
                />
                <Pressable style={styles.backLink} onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </Pressable>
            </View>
        );
    }

    const minQty = Math.max(1, product.min_order_quantity || 1);
    const maxQty = Math.max(minQty, product.stock_quantity);

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Product',
                    headerRight: () => (
                        <Pressable onPress={() => void handleWishlist()} hitSlop={10} style={styles.headerBtn}>
                            <Ionicons
                                name={wished ? 'heart' : 'heart-outline'}
                                size={23}
                                color={wished ? colors.primary : colors.text}
                            />
                        </Pressable>
                    ),
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </Pressable>
                    ),
                    headerTitle: '',
                }}
            />
            <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.galleryWrap}>
                    <ImageGallery images={images} />
                    {pct > 0 ? (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{pct}% OFF</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.body}>
                    {product.seller_name ? (
                        <Text style={styles.seller}>{product.seller_name}</Text>
                    ) : null}
                    <Text style={styles.name}>{product.name}</Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatPrice(product.selling_price)}</Text>
                        {product.mrp > product.selling_price ? (
                            <>
                                <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
                                <View style={styles.savePill}>
                                    <Text style={styles.savePillText}>
                                        Save {formatPrice(product.mrp - product.selling_price)}
                                    </Text>
                                </View>
                            </>
                        ) : null}
                    </View>
                    <Text style={styles.taxNote}>Inclusive of all taxes · {product.unit || 'pcs'}</Text>

                    <View style={styles.stockRow}>
                        <Ionicons
                            name={outOfStock ? 'close-circle-outline' : 'checkmark-circle'}
                            size={16}
                            color={outOfStock ? colors.danger : colors.success}
                        />
                        <Text style={[styles.stockText, outOfStock && styles.stockOut]}>
                            {outOfStock
                                ? 'Out of stock'
                                : product.stock_quantity <= 10
                                  ? `Only ${product.stock_quantity} left in stock`
                                  : 'In stock, ready to dispatch'}
                        </Text>
                        {product.sku ? <Text style={styles.sku}>SKU {product.sku}</Text> : null}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Offers for your business</Text>
                    <OfferRow icon="cube-outline" text={`Free delivery on orders above ${formatPrice(SHOPPING_OFFERS.freeDeliveryFrom)}`} />
                    <OfferRow
                        icon="pricetag-outline"
                        text={`Extra ${SHOPPING_OFFERS.bulkDiscountPercent}% off on orders above ${formatPrice(SHOPPING_OFFERS.bulkDiscountFrom)}`}
                    />
                    <OfferRow icon="shield-checkmark-outline" text="Genuine products from verified sellers" />
                </View>

                {!outOfStock ? (
                    <View style={styles.buyBox}>
                        <View style={styles.qtyRow}>
                            <Text style={styles.qtyLabel}>Quantity</Text>
                            <View style={styles.stepper}>
                                <Pressable
                                    style={styles.stepBtn}
                                    onPress={() => setQuantity((value) => Math.max(minQty, value - 1))}
                                >
                                    <Ionicons name="remove" size={17} color={colors.primary} />
                                </Pressable>
                                <Text style={styles.qtyValue}>{quantity}</Text>
                                <Pressable
                                    style={styles.stepBtn}
                                    onPress={() => setQuantity((value) => Math.min(maxQty, value + 1))}
                                >
                                    <Ionicons name="add" size={17} color={colors.primary} />
                                </Pressable>
                            </View>
                        </View>
                        {minQty > 1 ? (
                            <Text style={styles.minQtyNote}>Minimum order quantity: {minQty}</Text>
                        ) : null}

                        <View style={styles.ctaRow}>
                            <View style={styles.ctaItem}>
                                <PrimaryButton
                                    label="Add to cart"
                                    variant="outline"
                                    onPress={() => void addItem(false)}
                                    loading={adding}
                                    disabled={buying}
                                />
                            </View>
                            <View style={styles.ctaItem}>
                                <PrimaryButton
                                    label="Buy now"
                                    onPress={() => void addItem(true)}
                                    loading={buying}
                                    disabled={adding}
                                />
                            </View>
                        </View>
                    </View>
                ) : null}

                {product.short_description ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>About this product</Text>
                        <Text style={styles.description}>{product.short_description}</Text>
                    </View>
                ) : null}

                {product.description ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Product details</Text>
                        <Text style={styles.description}>{product.description}</Text>
                    </View>
                ) : null}

                {Object.keys(product.attributes ?? {}).length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Specifications</Text>
                        {Object.entries(product.attributes)
                            .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
                            .map(([key, value]) => (
                                <View key={key} style={styles.attrRow}>
                                    <Text style={styles.attrKey}>{key.replace(/_/g, ' ')}</Text>
                                    <Text style={styles.attrValue}>{String(value)}</Text>
                                </View>
                            ))}
                    </View>
                ) : null}

                {variants.length > 1 ? (
                    <View style={styles.section}>
                        <SectionHeader title="Other variants" />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantRow}>
                            {variants.map((variant) => {
                                const active = variant.id === product.id;
                                return (
                                    <Pressable
                                        key={variant.id}
                                        style={[styles.variantChip, active && styles.variantActive]}
                                        onPress={() =>
                                            router.replace({ pathname: '/product/[slug]', params: { slug: variant.slug } })
                                        }
                                    >
                                        <Text style={[styles.variantText, active && styles.variantTextActive]} numberOfLines={1}>
                                            {variant.name}
                                        </Text>
                                        <Text style={[styles.variantPrice, active && styles.variantTextActive]}>
                                            {formatPrice(variant.selling_price)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : null}

                <Pressable style={styles.shareRow} onPress={() => void shareProduct()}>
                    <Ionicons name="share-social-outline" size={17} color={colors.primary} />
                    <Text style={styles.shareText}>Share this product</Text>
                </Pressable>

                {related.length > 0 ? (
                    <View style={styles.section}>
                        <SectionHeader title="You may also like" />
                        <View style={styles.relatedGrid}>
                            {related.slice(0, 4).map((item) => (
                                <View key={item.id} style={styles.relatedItem}>
                                    <ProductCard product={item} compact />
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
            </ScrollView>
        </>
    );
}

function OfferRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.offerRow}>
            <Ionicons name={icon} size={16} color={colors.primary} />
            <Text style={styles.offerText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    headerBtn: { paddingHorizontal: 4 },
    galleryWrap: { position: 'relative', marginTop: 4 },
    discountBadge: {
        position: 'absolute',
        top: 14,
        left: 28,
        backgroundColor: colors.primary,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 10,
    },
    discountText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
    body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 5 },
    seller: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: colors.primary, textTransform: 'uppercase' },
    name: { fontSize: 21, fontWeight: '800', color: colors.text, lineHeight: 27, letterSpacing: -0.3 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    price: { fontSize: 26, fontWeight: '900', color: colors.primary },
    mrp: { fontSize: 14, color: colors.textFaint, textDecorationLine: 'line-through' },
    savePill: { backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    savePillText: { color: colors.success, fontSize: 10.5, fontWeight: '800' },
    taxNote: { fontSize: 11.5, color: colors.textFaint },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
    stockText: { fontSize: 12, fontWeight: '700', color: colors.success },
    stockOut: { color: colors.danger },
    sku: { marginLeft: 'auto', fontSize: 10.5, color: colors.textFaint },
    card: {
        marginHorizontal: spacing.lg,
        marginTop: 14,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
    offerRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    offerText: { flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 17 },
    buyBox: {
        marginHorizontal: spacing.lg,
        marginTop: 14,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtyLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        overflow: 'hidden',
    },
    stepBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFaint },
    qtyValue: { minWidth: 36, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
    minQtyNote: { marginTop: -4, fontSize: 11, color: colors.textMuted },
    ctaRow: { flexDirection: 'row', gap: 10 },
    ctaItem: { flex: 1 },
    description: { fontSize: 13.5, lineHeight: 21, color: colors.textMuted },
    attrRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
    attrKey: { fontSize: 12.5, color: colors.textMuted, textTransform: 'capitalize', flex: 1 },
    attrValue: { fontSize: 12.5, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
    section: { marginTop: 22 },
    variantRow: { paddingHorizontal: spacing.lg, gap: 10 },
    variantChip: {
        width: 150,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: 10,
        backgroundColor: colors.surface,
        gap: 3,
    },
    variantActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
    variantText: { fontSize: 12, fontWeight: '700', color: colors.text },
    variantTextActive: { color: colors.primary },
    variantPrice: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
    shareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginTop: 22,
        paddingVertical: 6,
    },
    shareText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: 10 },
    relatedItem: { width: '48.4%' },
    backLink: { alignItems: 'center', paddingBottom: 24 },
    backLinkText: { color: colors.primary, fontWeight: '700' },
});
