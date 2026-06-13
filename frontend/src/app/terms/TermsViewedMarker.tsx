'use client';

import { useEffect } from 'react';

import { TERMS_VIEWED_STORAGE_KEY } from '@/lib/legal';

export function TermsViewedMarker() {
    useEffect(() => {
        window.localStorage.setItem(TERMS_VIEWED_STORAGE_KEY, 'true');
    }, []);

    return null;
}
