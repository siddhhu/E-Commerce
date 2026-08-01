import { ShopShell } from '@/components/layout/ShopShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
    return (
        <ShopShell extraBottomPadding mainClassName="py-8">
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
            </div>
        </ShopShell>
    );
}
