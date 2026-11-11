import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/src/components/ui';
import { useOnboardingStore } from '@/src/store/onboarding';

/** First screen — routes to welcome onboarding or main tabs. */
export default function AppEntry() {
    const hydrated = useOnboardingStore((s) => s.hydrated);
    const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);

    if (!hydrated) return <LoadingScreen />;
    if (!hasSeenWelcome) return <Redirect href="/welcome" />;
    return <Redirect href="/(tabs)" />;
}
