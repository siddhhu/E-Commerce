import { Metadata } from 'next';
import AdminGuard from '@/components/admin/AdminGuard';

export const metadata: Metadata = {
    title: 'Admin Dashboard - Pranjay',
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            {children}
        </AdminGuard>
    );
}

