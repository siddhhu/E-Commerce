import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { discountPercent, formatPrice, resolveImageUrl } from '@/src/lib/format';
import type { ProductSummary } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';
import { useWishlistStore } from '@/src/store/wishlist';
import { useAuthStore } from '@/src/store/auth';
import { useToast } from '@/src/components/Toast';
import { primeProductPreview } from '@/src/lib/productPreview';

type ImagePriority = 'low' | 'normal' | 'high';

function ProductCardBase({
    product,
    onAddToCart,
    compact,
    showWishlist = true,
    imagePriority = 'normal',
}: {
    product: ProductSummary;
    onAddToCart?: (product: ProductSummary) => void | Promise<void>;
    compact?: boolean;
    showWishlist?: boolean;
    /** Screens above the fold can starve a 20-image grid; mark the rest low. */
    imagePriority?: ImagePriority;
}) {
    const router = useRouter();
    const { show } = useToast();
    const authenticated = useAuthStore((s) => Boolean(s.accessToken));
    const wished = useWishlistStore((s) => s.items.some((item) => item.product_id === product.id));
    const toggleWishlist = useWishlistStore((s) => s.toggle);
    const [adding, setAdding] = useState(false);

    const pct = discountPercent(product.mrp, product.selling_price);
    const image = resolveImageUrl(product.primary_image || product.image_url);
    const price = Math.round(product.selling_price * 100) / 100;
    const outOfStock = product.stock_quantity <= 0;
    const savings = useMemo(
        () => Math.max(0, Math.round((product.mrp - product.selling_price) * 100) / 100),
        [product.mrp, product.selling_price]
    );

    const handleWishlist = async () => {
        if (!authenticated) {
            router.push('/login');
            return;
        }
        try {
            const added = await toggleWishlist(product.id);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            show(added ? 'Saved to wishlist' : 'Removed from wishlist', added ? 'success' : 'info');
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not update wishlist', 'error');
        }
    };

    const handleAdd = async () => {
        if (!onAddToCart || adding) return;
        setAdding(true);
        try {
            await onAddToCart(product);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setAdding(false);
        }
    };

    return (
        <View style={[styles.card, compact && styles.cardCompact]}>
            <Link href={`/product/${product.slug}`} asChild>
                <Pressable style={styles.imageWrap} onPressIn={() => primeProductPreview(product)}>
                    {image ? (
                        <Image
                            source={{ uri: image }}
                            style={styles.image}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="memory-disk"
                            recyclingKey={product.id}
                            priority={imagePriority}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderLetter}>{product.name.charAt(0)}</Text>
                        </View>
                    )}

                    {pct > 0 ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pct}% OFF</Text>
                        </View>
                    ) : null}

                    {outOfStock ? (
                        <View style={styles.stockBadge}>
                            <Text style={styles.stockBadgeText}>Out of stock</Text>
                        </View>
                    ) : null}
                </Pressable>
            </Link>

            {showWishlist ? (
                <Pressable style={styles.heart} onPress={() => void handleWishlist()} hitSlop={10}>
                    <Text style={[styles.heartText, wished && styles.heartActive]}>{wished ? '♥' : '♡'}</Text>
                </Pressable>
            ) : null}

            <Link href={`/product/${product.slug}`} asChild>
                <Pressable style={styles.body} onPressIn={() => primeProductPreview(product)}>
                    {product.seller_name ? (
                        <Text numberOfLines={1} style={styles.seller}>
                            {product.seller_name}
                        </Text>
                    ) : null}
                    <Text numberOfLines={2} style={styles.name}>
                        {product.name}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatPrice(price)}</Text>
                        {product.mrp > product.selling_price ? (
                            <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
                        ) : null}
                    </View>
                    {savings > 0 ? (
                        <Text style={styles.savings}>Save {formatPrice(savings)}</Text>
                    ) : (
                        <Text style={styles.savingsPlaceholder}>{product.sku ? `SKU ${product.sku}` : ' '}</Text>
                    )}
                </Pressable>
            </Link>

            {onAddToCart ? (
                <Pressable
                    style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
                    disabled={outOfStock || adding}
                    onPress={() => void handleAdd()}
                >
                    <Text style={styles.addBtnText}>{outOfStock ? 'Unavailable' : adding ? 'Adding…' : '+ Add'}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

/**
 * Cards are pure given a stable `onAddToCart`: memoising them keeps a 20-item
 * grid from re-rendering every card on each filter or pagination update.
 */
export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        paddingBottom: 10,
    },
    cardCompact: { flex: 1 },
    imageWrap: { aspectRatio: 1, backgroundColor: colors.surfaceMuted, position: 'relative' },
    image: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderLetter: { fontSize: 34, fontWeight: '800', color: colors.primary },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    stockBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(26,16,32,0.72)',
        borderRadius: 8,
        paddingVertical: 5,
        alignItems: 'center',
    },
    stockBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    heart: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartText: { fontSize: 16, color: colors.textMuted, lineHeight: 19 },
    heartActive: { color: colors.primary },
    body: { paddingHorizontal: 10, paddingTop: 8, gap: 3 },
    seller: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, color: colors.primary, textTransform: 'uppercase' },
    name: { fontSize: 12, fontWeight: '600', color: colors.text, minHeight: 32, lineHeight: 16 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 1 },
    price: { fontSize: 15, fontWeight: '800', color: colors.text },
    // price kept in a local for rounded display; see PriceBreakdown for totals
    mrp: { fontSize: 11, color: colors.textFaint, textDecorationLine: 'line-through' },
    savings: { fontSize: 10, color: colors.success, fontWeight: '700' },
    savingsPlaceholder: { fontSize: 10, color: colors.textFaint },
    addBtn: {
        marginTop: 8,
        marginHorizontal: 10,
        backgroundColor: colors.primarySoft,
        paddingVertical: 7,
        borderRadius: radius.pill,
        alignItems: 'center',
    },
    addBtnDisabled: { backgroundColor: '#F1F1F1' },
    addBtnText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
});
