import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { getProductLabels } from '@/lib/product-labels';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();
    const { toast } = useToast();

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigating to the product page
        e.stopPropagation();
        
        addItem(product as any, product.min_order_quantity || 1);
        
        toast({
            title: "Added to cart",
            description: `${product.name} has been added to your cart.`
        });
    };

    const handleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toast({
            title: "Added to wishlist",
            description: `${product.name} saved for later.`
        });
    };

    const discount = product.mrp > 0 
        ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) 
        : 0;
    const labels = getProductLabels(product).slice(0, 2);

    return (
        <Link href={`/products/${product.slug}`} className="block">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full overflow-hidden group">
                
                {/* Image & Badges Container */}
                <div className="relative aspect-[4/4.4] md:aspect-square p-3 md:p-6 flex items-center justify-center bg-gradient-to-b from-white to-slate-50 border-b border-slate-50">
                    {/* Top Left Badges */}
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1.5 z-10">
                        {discount > 0 && (
                            <div className="bg-[#e91e63] text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                {discount}% OFF
                            </div>
                        )}
                        {labels.map((label) => (
                            <div key={label.text} className={`${label.className} text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full shadow-sm`}>
                                {label.text}
                            </div>
                        ))}
                    </div>
                    
                    {/* Top Right Wishlist */}
                    <button 
                        onClick={handleWishlist}
                        className="absolute top-2 right-2 md:top-3 md:right-3 h-8 w-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-sm z-10 text-slate-500 hover:text-[#e91e63]"
                        aria-label={`Add ${product.name} to wishlist`}
                    >
                        <Heart className="h-4 w-4" />
                    </button>

                    {/* Product Image */}
                    <div className="relative w-full h-full">
                        <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>

                {/* Content Container */}
                <div className="p-3 md:p-4 flex flex-col flex-grow">
                    {/* Brand Name / Title */}
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 line-clamp-2 uppercase tracking-tight mb-1 min-h-[2rem] md:min-h-0">
                        {product.name}
                    </h3>
                    
                    {/* Short Description */}
                    <p className="text-[10px] md:text-xs text-slate-500 line-clamp-1 mb-2 md:mb-3 uppercase tracking-wider">
                        {product.short_description || "Premium Quality Product"}
                    </p>
                    
                    <div className="mt-auto">
                        {/* Pricing */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-3 md:mb-4">
                            <span className="text-[#e91e63] font-bold text-base md:text-lg">
                                {formatCurrency(product.selling_price)}
                            </span>
                            {product.mrp > product.selling_price && (
                                <span className="text-slate-400 text-xs md:text-sm line-through decoration-slate-300">
                                    {formatCurrency(product.mrp)}
                                </span>
                            )}
                        </div>
                        
                        {/* Add to Cart Button */}
                        <Button 
                            onClick={handleAddToCart}
                            className="w-full h-9 md:h-10 bg-[#e91e63] hover:bg-[#c2185b] text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm shadow-pink-200"
                        >
                            <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
