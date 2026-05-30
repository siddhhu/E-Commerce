import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

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

    return (
        <Link href={`/products/${product.slug}`} className="block">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group">
                
                {/* Image & Badges Container */}
                <div className="relative aspect-square p-6 flex items-center justify-center bg-white border-b border-slate-50">
                    {/* Top Left Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {discount > 0 && (
                            <div className="bg-[#e91e63] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                {discount}% OFF
                            </div>
                        )}
                        {product.is_featured && (
                            <div className="bg-[#ff9800] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                Featured
                            </div>
                        )}
                    </div>
                    
                    {/* Top Right Wishlist */}
                    <button 
                        onClick={handleWishlist}
                        className="absolute top-3 right-3 h-8 w-8 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors shadow-sm z-10 text-slate-500 hover:text-[#e91e63]"
                    >
                        <Heart className="h-4 w-4" />
                    </button>

                    {/* Product Image */}
                    <div className="relative w-full h-full">
                        <Image
                            src={product.image_url || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>

                {/* Content Container */}
                <div className="p-4 flex flex-col flex-grow">
                    {/* Brand Name / Title */}
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 uppercase tracking-tight mb-1">
                        {product.name}
                    </h3>
                    
                    {/* Short Description */}
                    <p className="text-xs text-slate-500 line-clamp-1 mb-3 uppercase tracking-wider">
                        {product.short_description || "Premium Quality Product"}
                    </p>
                    
                    <div className="mt-auto">
                        {/* Pricing */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[#e91e63] font-bold text-lg">
                                {formatCurrency(product.selling_price)}
                            </span>
                            {product.mrp > product.selling_price && (
                                <span className="text-slate-400 text-sm line-through decoration-slate-300">
                                    {formatCurrency(product.mrp)}
                                </span>
                            )}
                        </div>
                        
                        {/* Add to Cart Button */}
                        <Button 
                            onClick={handleAddToCart}
                            className="w-full bg-[#e91e63] hover:bg-[#c2185b] text-white font-semibold rounded-lg shadow-sm shadow-pink-200"
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
