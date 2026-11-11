import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Shared product links point at the website path (/products/<slug>). Without
 * this route a tapped link lands on the "not found" screen; here it opens the
 * real product page in the app instead.
 */
export default function ProductLinkScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();

    if (!slug) return <Redirect href="/(tabs)/shop" />;

    return <Redirect href={{ pathname: '/product/[slug]', params: { slug } }} />;
}
