import { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimaryButton } from '@/src/components/ui';
import { useOnboardingStore } from '@/src/store/onboarding';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type WelcomeSlide = {
    id: string;
    kicker: string;
    title: string;
    subtitle: string;
    emoji: string;
    accent: string;
};

const SLIDES: WelcomeSlide[] = [
    {
        id: '1',
        kicker: 'PRANJAY APP',
        title: 'Wholesale beauty\nfor your business',
        subtitle: 'Salon supplies, cosmetics & professional products — curated for retailers and parlours.',
        emoji: '✨',
        accent: '#2D0A1E',
    },
    {
        id: '2',
        kicker: 'FAST DELIVERY',
        title: 'Free delivery\non ₹1,000+',
        subtitle: 'Order essentials with transparent pricing, live deals, and order tracking in the app.',
        emoji: '🚚',
        accent: '#1B4332',
    },
    {
        id: '3',
        kicker: 'NATIVE EXPERIENCE',
        title: 'Built for\nmobile shopping',
        subtitle: 'Smooth browsing, secure checkout, Razorpay payments, and wishlist — not just a website wrapper.',
        emoji: '📱',
        accent: '#312E81',
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<WelcomeSlide>>(null);

    const finish = async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await markWelcomeSeen();
        router.replace('/(tabs)');
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (next !== index) setIndex(next);
    };

    const goNext = () => {
        if (index >= SLIDES.length - 1) {
            void finish();
            return;
        }
        listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    };

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <View style={styles.topBar}>
                <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
                <Text style={styles.brand}>Pranjay</Text>
                <Pressable onPress={() => void finish()} hitSlop={12}>
                    <Text style={styles.skip}>Skip</Text>
                </Pressable>
            </View>

            <FlatList
                ref={listRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                        <View style={[styles.heroCard, { backgroundColor: item.accent }]}>
                            <Text style={styles.emoji}>{item.emoji}</Text>
                            <Text style={styles.kicker}>{item.kicker}</Text>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.subtitle}>{item.subtitle}</Text>
                        </View>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((slide, i) => (
                        <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
                    ))}
                </View>
                <PrimaryButton
                    label={index >= SLIDES.length - 1 ? 'Get started' : 'Continue'}
                    onPress={goNext}
                />
                <Text style={styles.footerNote}>Exclusive app experience · Same trusted Pranjay catalog</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFF7FB' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 10,
    },
    logo: { width: 36, height: 36, borderRadius: 10 },
    brand: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text },
    skip: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
    slide: { paddingHorizontal: 20, justifyContent: 'center' },
    heroCard: {
        borderRadius: 28,
        padding: 28,
        minHeight: 360,
        justifyContent: 'flex-end',
    },
    emoji: { fontSize: 48, marginBottom: 12 },
    kicker: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
    title: { marginTop: 10, fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 40 },
    subtitle: { marginTop: 12, fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 22 },
    footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#E2E8F0' },
    dotActive: { width: 22, backgroundColor: colors.primary },
    footerNote: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
