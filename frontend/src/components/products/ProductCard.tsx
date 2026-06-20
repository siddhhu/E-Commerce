import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Product } from '@/lib/api';
import { cn, formatPrice, getDiscountPercentage, resolveImageUrl } from '@/lib/utils';
import { getProductLabels } from '@/lib/product-labels';

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
    const [imgError, setImgError] = useState(false);
    
    const primaryImage = resolveImageUrl(imgError ? '/placeholder.jpg' : (
        product.image_url ||
        product.images?.find((img) => img.is_primary)?.image_url ||
        product.images?.[0]?.image_url ||
        '/placeholder.jpg'
    ));

    const discount = getDiscountPercentage(product.mrp, product.selling_price);
    const isOutOfStock = product.stock_quantity <= 0;
    const labels = getProductLabels(product).slice(0, 3);

    const handleWishlistClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToWishlist?.(product.id);
    };

    const handleCartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToCart?.(product.id);
    };

    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="relative aspect-square overflow-hidden bg-muted">
                <Link href={`/products/${product.slug}`}>
                    <img
                        src={primaryImage}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                </Link>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.is_discounted_featured && <span className="bg-[#d81b60] text-white text-[10px] uppercase font-extrabold tracking-wide px-2 py-1 rounded-full shadow-sm animate-pulse">Live Discount</span>}
                    {discount > 0 && <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">{discount}% OFF</span>}
                    {labels.map((label) => (
                        <span key={label.text} className={cn("text-xs font-semibold px-2 py-1 rounded-full shadow-sm", label.className)}>
                            {label.text}
                        </span>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md"
                        onClick={handleWishlistClick}
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

                {product.is_discounted_featured && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1.5 rounded-md">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Offer might end soon</span>
                    </div>
                )}

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
                            Wholesale: {formatPrice(product.b2b_price)}
                        </span>
                    )}
                </div>

                <Button
                    className="w-full mt-4"
                    disabled={isOutOfStock}
                    onClick={handleCartClick}
                >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </Button>
            </CardContent>
        </Card>
    );
}
