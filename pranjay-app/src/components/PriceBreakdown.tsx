import { StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '@/src/lib/format';
import { computeTotals, SHOPPING_OFFERS } from '@/src/lib/pricing';
import { colors, radius } from '@/src/theme/colors';

export function PriceBreakdown({
    subtotal,
    promoDiscount = 0,
    showOffers = true,
}: {
    subtotal: number;
    promoDiscount?: number;
    showOffers?: boolean;
}) {
    const totals = computeTotals(subtotal, promoDiscount);

    return (
        <View style={styles.wrap}>
            <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
            {totals.promoDiscount > 0 ? (
                <Row label="Promo discount" value={`− ${formatPrice(totals.promoDiscount)}`} positive />
            ) : null}
            {totals.bulkDiscount > 0 ? (
                <Row label={`Bulk discount (${SHOPPING_OFFERS.bulkDiscountPercent}%)`} value={`− ${formatPrice(totals.bulkDiscount)}`} positive />
            ) : null}
            <Row
                label="Delivery"
                value={totals.deliveryFee === 0 ? 'FREE' : formatPrice(totals.deliveryFee)}
                positive={totals.deliveryFee === 0}
            />

            {showOffers && totals.deliveryFee > 0 ? (
                <Text style={styles.hint}>
                    Add {formatPrice(totals.freeDeliveryShortfall)} more for free delivery
                </Text>
            ) : null}
            {showOffers && totals.bulkDiscount === 0 ? (
                <Text style={styles.hint}>
                    Extra {SHOPPING_OFFERS.bulkDiscountPercent}% off above {formatPrice(SHOPPING_OFFERS.bulkDiscountFrom)}
                    {totals.bulkShortfall > 0 ? ` · ${formatPrice(totals.bulkShortfall)} to go` : ''}
                </Text>
            ) : null}
            {totals.bulkDiscount > 0 ? (
                <Text style={[styles.hint, styles.hintSuccess]}>
                    Bulk saving applied — you save {formatPrice(totals.bulkDiscount)} extra
                </Text>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(totals.total)}</Text>
            </View>
            <Text style={styles.taxNote}>Prices include GST · Delivery calculated at checkout</Text>
        </View>
    );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, positive && styles.positive]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    label: { fontSize: 14, color: colors.textMuted },
    value: { fontSize: 14, color: colors.text, fontWeight: '600' },
    positive: { color: colors.success },
    hint: { fontSize: 11.5, color: colors.primary, fontWeight: '600', paddingVertical: 2 },
    hintSuccess: { color: colors.success },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
    totalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
    taxNote: { marginTop: 6, fontSize: 11, color: colors.textFaint },
});

export const priceCardStyle = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 },
});
