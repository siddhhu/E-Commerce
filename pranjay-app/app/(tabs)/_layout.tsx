import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/src/store/cart';
import { colors } from '@/src/theme/colors';

export default function TabLayout() {
    const cartCount = useCartStore((s) => s.cart.items_count);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textFaint,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 66,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 7,
                    elevation: 12,
                    shadowColor: '#2D0A1E',
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="shop"
                options={{
                    title: 'Shop',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: colors.primary,
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: '800',
                        minWidth: 17,
                        height: 17,
                        lineHeight: 17,
                    },
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? 'bag' : 'bag-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
