import HomePageClient from '@/components/home/HomePageClient';
import { CategoryRead } from '@/lib/api';
import { APIProduct as APIProductSummary } from '@/lib/api-service';
import { fetchServerJson, getServerApiBaseUrl } from '@/lib/server-api';

export const revalidate = 60;

interface HomeBootstrap {
    featured: APIProductSummary[];
    discounted: APIProductSummary[];
    categories: CategoryRead[];
    banners: Array<{ id: string; title: string; image_url: string; link_url?: string; is_active: boolean }>;
}

async function fetchHomeBootstrap(): Promise<HomeBootstrap | null> {
    const base = getServerApiBaseUrl();
    return fetchServerJson<HomeBootstrap>(`${base}/api/v1/home/bootstrap?featured_limit=20&discounted_limit=20`, {
        next: { revalidate: 60 },
    });
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
