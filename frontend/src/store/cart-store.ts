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

    promo_code: string | null;
    promo_discount: number;
    invoice_url: string | null;

    // Actions
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;

    setPromo: (promo: { code: string; discount_amount: number }) => void;
    clearPromo: () => void;
    setInvoiceUrl: (invoiceUrl: string) => void;
    clearInvoiceUrl: () => void;

    // Computed
    getItemCount: () => number;
    getSubtotal: () => number;
    getDiscount: () => number;
    getTax: () => number;
    getTotal: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            promo_code: null,
            promo_discount: 0,
            invoice_url: null,

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
                set({ items: [], promo_code: null, promo_discount: 0, invoice_url: null });
            },

            setPromo: ({ code, discount_amount }) => {
                set({ promo_code: code, promo_discount: Math.max(0, Number(discount_amount) || 0) });
            },

            clearPromo: () => {
                set({ promo_code: null, promo_discount: 0 });
            },

            setInvoiceUrl: (invoiceUrl) => {
                set({ invoice_url: invoiceUrl });
            },

            clearInvoiceUrl: () => {
                set({ invoice_url: null });
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

            getDiscount: () => {
                const subtotal = get().getSubtotal();
                const discount = get().promo_discount || 0;
                return Math.min(subtotal, Math.max(0, discount));
            },

            getTax: () => {
                const subtotal = get().getSubtotal() - get().getDiscount();
                // Prices are GST-inclusive. For 18% GST:
                // base = subtotal / 1.18
                // gst = subtotal - base
                return subtotal - subtotal / 1.18;
            },

            getTotal: () => {
                // Total is GST-inclusive already
                return get().getSubtotal() - get().getDiscount();
            },
        }),
        {
            name: 'pranjay-cart',
        }
    )
);
