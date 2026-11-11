import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Linking,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { resolveImageUrl } from '@/src/lib/format';
import type { AppBanner } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH / 2.4);
const GAP = 12;

export type { AppBanner };

export function BannerCarousel({ banners }: { banners: AppBanner[] }) {
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((prev) => {
                const next = (prev + 1) % banners.length;
                scrollRef.current?.scrollTo({ x: next * (BANNER_WIDTH + GAP), animated: true });
                return next;
            });
        }, 4500);
        return () => clearInterval(timer);
    }, [banners.length]);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = Math.round(event.nativeEvent.contentOffset.x / (BANNER_WIDTH + GAP));
        if (next !== index && next >= 0 && next < banners.length) setIndex(next);
    };

    const openBanner = (banner: AppBanner) => {
        const url = banner.link_url?.trim();
        if (!url) return;
        if (/^https?:\/\//i.test(url)) {
            void Linking.openURL(url);
            return;
        }
        router.push(url as never);
    };

    if (!banners.length) return null;

    return (
        <View style={styles.wrap}>
            <ScrollView
                ref={scrollRef}
                horizontal
                snapToInterval={BANNER_WIDTH + GAP}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {banners.map((banner) => (
                    <Pressable key={banner.id} style={styles.banner} onPress={() => openBanner(banner)}>
                        <Image
                            source={{ uri: resolveImageUrl(banner.image_url) }}
                            style={styles.image}
                            contentFit="cover"
                            transition={200}
                        />
                        {banner.title ? (
                            <View style={styles.caption}>
                                <Text numberOfLines={2} style={styles.captionText}>
                                    {banner.title}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                ))}
            </ScrollView>
            {banners.length > 1 ? (
                <View style={styles.dots}>
                    {banners.map((banner, i) => (
                        <View key={banner.id} style={[styles.dot, i === index && styles.dotActive]} />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginBottom: 8 },
    row: { paddingHorizontal: 16, gap: GAP },
    banner: {
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.primarySoft,
    },
    image: { width: '100%', height: '100%' },
    caption: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(26, 16, 32, 0.48)',
    },
    captionText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#EBD9E4' },
    dotActive: { width: 18, backgroundColor: colors.primary },
});
