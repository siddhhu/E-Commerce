import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-8">
                <div className="container">
                    <Skeleton className="h-10 w-64 mb-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                        <aside className="hidden lg:block space-y-4">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </aside>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-square w-full rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
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
