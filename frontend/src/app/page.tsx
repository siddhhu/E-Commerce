import HomePageClient from '@/components/home/HomePageClient';

export const revalidate = 60;

async function fetchHomeBootstrap() {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    try {
        const res = await fetch(`${base}/api/v1/home/bootstrap?featured_limit=20&discounted_limit=20`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function HomePage() {
    const bootstrap = await fetchHomeBootstrap();

    return (
        <HomePageClient
            initialFeaturedProducts={bootstrap?.featured ?? null}
            initialDiscountedProducts={bootstrap?.discounted ?? null}
            initialBanners={bootstrap?.banners ?? null}
            initialCategories={bootstrap?.categories ?? null}
        />
    );
}
