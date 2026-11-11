import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const WELCOME_KEY = 'pranjay_welcome_seen_v1';

interface OnboardingState {
    hydrated: boolean;
    hasSeenWelcome: boolean;
    hydrate: () => Promise<void>;
    markWelcomeSeen: () => Promise<void>;
    resetWelcome: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    hydrated: false,
    hasSeenWelcome: false,

    hydrate: async () => {
        const seen = await AsyncStorage.getItem(WELCOME_KEY);
        set({ hasSeenWelcome: seen === '1', hydrated: true });
    },

    markWelcomeSeen: async () => {
        await AsyncStorage.setItem(WELCOME_KEY, '1');
        set({ hasSeenWelcome: true });
    },

    resetWelcome: async () => {
        await AsyncStorage.removeItem(WELCOME_KEY);
        set({ hasSeenWelcome: false });
    },
}));
