import HomePageClient from '@/components/home/HomePageClient';
import { apiService } from '@/lib/api-service';
import { bannerApi } from '@/lib/api';

// Revalidate the page every 60 seconds (Static Site Generation / Incremental Static Regeneration)
export const revalidate = 60;

export default async function HomePage() {
    // Fetch data in parallel on the server to eliminate loading states for the user
    let featuredProducts = null;
    let banners = null;

    try {
        const [featuredRes, bannersRes] = await Promise.all([
            apiService.getFeaturedProducts(8).catch((err) => {
                console.error("Server fetch error (featured):", err);
                return null;
            }),
            bannerApi.list().catch((err) => {
                console.error("Server fetch error (banners):", err);
                return null;
            })
        ]);
        featuredProducts = featuredRes;
        banners = bannersRes;
    } catch (err) {
        console.error("Server fetch error (Promise.all):", err);
    }

    return (
        <HomePageClient 
            initialFeaturedProducts={featuredProducts}
            initialBanners={banners}
        />
    );
}
