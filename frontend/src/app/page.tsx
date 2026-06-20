import HomePageClient from '@/components/home/HomePageClient';
import { apiService } from '@/lib/api-service';
import { bannerApi, categoriesApi } from '@/lib/api';

// Revalidate the page every 60 seconds (Static Site Generation / Incremental Static Regeneration)
export const revalidate = 60;

export default async function HomePage() {
    // Fetch data in parallel on the server to eliminate loading states for the user
    let featuredProducts = null;
    let banners = null;
    let categories = null;

    try {
        const [featuredRes, bannersRes, categoriesRes] = await Promise.all([
            apiService.getFeaturedProducts(200).catch((err) => {
                console.error("Server fetch error (featured):", err);
                return null;
            }),
            bannerApi.list().catch((err) => {
                console.error("Server fetch error (banners):", err);
                return null;
            }),
            categoriesApi.list().catch((err) => {
                console.error("Server fetch error (categories):", err);
                return null;
            }),
        ]);
        featuredProducts = featuredRes;
        banners = bannersRes;
        categories = categoriesRes;
    } catch (err) {
        console.error("Server fetch error (Promise.all):", err);
    }

    return (
        <HomePageClient 
            initialFeaturedProducts={featuredProducts}
            initialBanners={banners}
            initialCategories={categories}
        />
    );
}
