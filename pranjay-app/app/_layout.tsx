import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { api } from '@/src/lib/api';
import { ToastProvider } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { useCartStore } from '@/src/store/cart';
import { useOnboardingStore } from '@/src/store/onboarding';
import { useRecentStore } from '@/src/store/recent';
import { useWishlistStore } from '@/src/store/wishlist';
import { colors } from '@/src/theme/colors';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const authHydrated = useAuthStore((s) => s.hydrated);
    const accessToken = useAuthStore((s) => s.accessToken);
    const doAuthHydrate = useAuthStore((s) => s.hydrate);
    const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
    const doOnboardingHydrate = useOnboardingStore((s) => s.hydrate);
    const recentHydrated = useRecentStore((s) => s.hydrated);
    const doRecentHydrate = useRecentStore((s) => s.hydrate);

    useEffect(() => {
        void Promise.all([
            doAuthHydrate(),
            doOnboardingHydrate(),
            doRecentHydrate(),
            api.primeCaches(),
        ]).finally(() => {
            void SplashScreen.hideAsync();
        });
    }, [doAuthHydrate, doOnboardingHydrate, doRecentHydrate]);

    useEffect(() => {
        if (!authHydrated) return;
        if (accessToken) {
            // These two only feed the cart badge and the wishlist screen. Queuing
            // them behind the first render stops them from competing with the
            // home screen's data request on a slow connection.
            const task = InteractionManager.runAfterInteractions(() => {
                void useCartStore.getState().refresh().catch(() => undefined);
                void useWishlistStore.getState().load(true);
            });
            return () => task.cancel();
        }
        useCartStore.getState().reset();
        useWishlistStore.getState().reset();
    }, [authHydrated, accessToken]);

    if (!authHydrated || !onboardingHydrated || !recentHydrated) return null;

    return (
        <ToastProvider>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShadowVisible: false,
                    headerTintColor: colors.primary,
                    headerTitleStyle: { fontWeight: '800', color: colors.text },
                    headerStyle: { backgroundColor: colors.bg },
                    contentStyle: { backgroundColor: colors.bg },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
                <Stack.Screen name="seller-onboarding" options={{ title: 'Become a seller' }} />
                <Stack.Screen name="search" options={{ title: 'Search', headerShown: false }} />
                <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
                <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
                <Stack.Screen name="product/[slug]" options={{ title: 'Product' }} />
                <Stack.Screen name="order/[id]" options={{ title: 'Order' }} />
                <Stack.Screen name="profile/edit" options={{ title: 'Edit profile' }} />
                <Stack.Screen name="addresses" options={{ title: 'My addresses' }} />
            </Stack>
        </ToastProvider>
    );
}
