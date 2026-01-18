import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Order {
    id: string;
    order_number: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
    payment_status: 'pending' | 'paid' | 'cod';
    payment_method: string;
    items: {
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        image_url: string;
    }[];
    subtotal: number;
    tax_amount: number;
    shipping_amount: number;
    total_amount: number;
    shipping_address: {
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
    };
    created_at: string;
}

interface OrderState {
    orders: Order[];

    // Actions
    addOrder: (order: Order) => void;
    getOrders: () => Order[];
    getOrderById: (id: string) => Order | undefined;
}

export const useOrderStore = create<OrderState>()(
    persist(
        (set, get) => ({
            orders: [],

            addOrder: (order) => {
                set((state) => ({
                    orders: [order, ...state.orders]
                }));
            },

            getOrders: () => {
                return get().orders;
            },

            getOrderById: (id) => {
                return get().orders.find(order => order.id === id);
            },
        }),
        {
            name: 'pranjay-orders',
        }
    )
);
