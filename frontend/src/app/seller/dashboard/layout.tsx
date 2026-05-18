import { Metadata } from 'next';
import SellerGuard from '@/components/seller/SellerGuard';

export const metadata: Metadata = {
    title: 'Seller Dashboard - Pranjay',
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
    return (
        <SellerGuard>
            {children}
        </SellerGuard>
    );
}
