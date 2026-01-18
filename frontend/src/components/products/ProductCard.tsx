import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Product } from '@/lib/api';
import { cn, formatPrice, getDiscountPercentage } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (productId: string) => void;
    onAddToWishlist?: (productId: string) => void;
}

export function ProductCard({
    product,
    onAddToCart,
    onAddToWishlist,
}: ProductCardProps) {
    const primaryImage = product.images?.find((img) => img.is_primary)?.image_url ||
        product.images?.[0]?.image_url ||
        '/placeholder.jpg';

    const discount = getDiscountPercentage(product.mrp, product.selling_price);
    const isOutOfStock = product.stock_quantity <= 0;

    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="relative aspect-square overflow-hidden bg-muted">
                <Link href={`/products/${product.slug}`}>
                    <Image
                        src={primaryImage}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {discount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                            {discount}% OFF
                        </span>
                    )}
                    {product.is_featured && (
                        <span className="bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded">
                            Featured
                        </span>
                    )}
                    {isOutOfStock && (
                        <span className="bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded">
                            Out of Stock
                        </span>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md"
                        onClick={() => onAddToWishlist?.(product.id)}
                    >
                        <Heart className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <CardContent className="p-4">
                <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium truncate hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {product.short_description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                        {product.short_description}
                    </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                            {formatPrice(product.selling_price)}
                        </span>
                        {discount > 0 && (
                            <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(product.mrp)}
                            </span>
                        )}
                    </div>

                    {product.b2b_price && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                            B2B: {formatPrice(product.b2b_price)}
                        </span>
                    )}
                </div>

                <Button
                    className="w-full mt-4"
                    disabled={isOutOfStock}
                    onClick={() => onAddToCart?.(product.id)}
                >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </Button>
            </CardContent>
        </Card>
    );
}
