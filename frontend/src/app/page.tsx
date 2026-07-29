import HomePageClient from '@/components/home/HomePageClient';
import { apiService } from '@/lib/api-service';
import { bannerApi, categoriesApi } from '@/lib/api';

// Revalidate the page every 60 seconds (Static Site Generation / Incremental Static Regeneration)
export const revalidate = 60;

export default async function HomePage() {
    // Fetch data in parallel on the server to eliminate loading states for the user
    let featuredProducts = null;
    let discountedProducts = null;
    let banners = null;
    let categories = null;

    try {
        const [featuredRes, discountedRes, bannersRes, categoriesRes] = await Promise.all([
            apiService.getFeaturedProducts(20).catch((err) => {
                console.error("Server fetch error (featured):", err);
                return null;
            }),
            apiService.getDiscountedFeaturedProducts(20).catch((err) => {
                console.error("Server fetch error (discounted):", err);
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
        discountedProducts = discountedRes;
        banners = bannersRes;
        categories = categoriesRes;
    } catch (err) {
        console.error("Server fetch error (Promise.all):", err);
    }

    return (
        <HomePageClient 
            initialFeaturedProducts={featuredProducts}
            initialDiscountedProducts={discountedProducts}
            initialBanners={banners}
            initialCategories={categories}
        />
    );
}
