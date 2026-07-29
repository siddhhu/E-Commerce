import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-8">
                <div className="container">
                    <Skeleton className="h-4 w-48 mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <div className="space-y-4">
                            <Skeleton className="aspect-square w-full rounded-2xl" />
                            <div className="flex gap-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-16 rounded-lg" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-10 w-1/2" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                    <div className="mt-14">
                        <Skeleton className="h-8 w-48 mb-5" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-square w-full rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
