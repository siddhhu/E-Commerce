import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, getProductById } from '@/lib/dummy-data';

export interface CartItem {
    id: string;
    product: Product;
    quantity: number;
}

interface CartState {
    items: CartItem[];

    // Actions
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;

    // Computed
    getItemCount: () => number;
    getSubtotal: () => number;
    getTax: () => number;
    getTotal: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, quantity = 1) => {
                set((state) => {
                    const existingItem = state.items.find(item => item.product.id === product.id);

                    if (existingItem) {
                        return {
                            items: state.items.map(item =>
                                item.product.id === product.id
                                    ? { ...item, quantity: item.quantity + quantity }
                                    : item
                            )
                        };
                    }

                    return {
                        items: [...state.items, { id: product.id, product, quantity }]
                    };
                });
            },

            removeItem: (productId) => {
                set((state) => ({
                    items: state.items.filter(item => item.product.id !== productId)
                }));
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                set((state) => ({
                    items: state.items.map(item =>
                        item.product.id === productId
                            ? { ...item, quantity }
                            : item
                    )
                }));
            },

            clearCart: () => {
                set({ items: [] });
            },

            getItemCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },

            getSubtotal: () => {
                return get().items.reduce(
                    (total, item) => total + item.product.selling_price * item.quantity,
                    0
                );
            },

            getTax: () => {
                return get().getSubtotal() * 0.18; // 18% GST
            },

            getTotal: () => {
                return get().getSubtotal() + get().getTax();
            },
        }),
        {
            name: 'pranjay-cart',
        }
    )
);
