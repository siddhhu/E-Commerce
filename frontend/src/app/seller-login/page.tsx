'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /seller-login is deprecated.
 * Sellers now log in via the unified /admin/login page
 * using their registered email and generated password.
 */
export default function SellerLoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
            Redirecting to login...
        </div>
    );
}
