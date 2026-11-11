import { useRef, useState } from 'react';
import {
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_WIDTH = SCREEN_WIDTH - 32;

export function ImageGallery({ images, fallback }: { images: string[]; fallback?: string }) {
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const urls = images.length > 0 ? images : fallback ? [fallback] : [];

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = Math.round(event.nativeEvent.contentOffset.x / GALLERY_WIDTH);
        if (next !== index) setIndex(next);
    };

    if (urls.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>P</Text>
            </View>
        );
    }

    return (
        <View>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={styles.scroll}
            >
                {urls.map((url, i) => (
                    <View key={`${url}-${i}`} style={styles.slide}>
                        <Image
                            source={{ uri: url }}
                            style={styles.image}
                            contentFit="contain"
                            transition={150}
                            cachePolicy="memory-disk"
                            recyclingKey={url}
                        />
                    </View>
                ))}
            </ScrollView>

            {urls.length > 1 ? (
                <>
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>
                            {index + 1}/{urls.length}
                        </Text>
                    </View>
                    <View style={styles.dots}>
                        {urls.map((url, i) => (
                            <View key={`dot-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
                        ))}
                    </View>
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { width: GALLERY_WIDTH, marginHorizontal: 16, borderRadius: radius.xl },
    slide: {
        width: GALLERY_WIDTH,
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    image: { width: '100%', height: '100%' },
    empty: {
        width: GALLERY_WIDTH,
        aspectRatio: 1,
        marginHorizontal: 16,
        borderRadius: radius.xl,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: { fontSize: 64, fontWeight: '900', color: colors.primary },
    counter: {
        position: 'absolute',
        right: 28,
        top: 12,
        backgroundColor: 'rgba(26,16,32,0.6)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    counterText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EBD9E4' },
    dotActive: { width: 18, backgroundColor: colors.primary },
});
