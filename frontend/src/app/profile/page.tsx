'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Package, MapPin, Phone, Mail, Calendar, Settings, ChevronRight, LogOut, Building2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/store/auth-store';
import { ordersApi, authApi, Order } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isAuthenticated, isLoading: isAuthLoading, logout, _hasHydrated, setUser } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        business_name: user?.business_name || '',
        gst_number: user?.gst_number || '',
        user_type: user?.user_type || 'customer'
    });

    useEffect(() => {
        if (_hasHydrated && !isAuthLoading && !isAuthenticated) {
            router.push('/login?redirect=/profile');
            return;
        }

        if (isAuthenticated && user) {
            setFormData({
                full_name: user.full_name || '',
                business_name: user.business_name || '',
                gst_number: user.gst_number || '',
                user_type: user.user_type || 'customer'
            });

            const fetchRecentOrders = async () => {
                setIsLoadingOrders(true);
                try {
                    const data = await ordersApi.list();
                    setOrders(data.items.slice(0, 3));
                } catch (error) {
                    console.error('Failed to fetch orders:', error);
                } finally {
                    setIsLoadingOrders(false);
                }
            };
            fetchRecentOrders();
        }
    }, [isAuthenticated, isAuthLoading, _hasHydrated, router, user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const updatedUser = await authApi.updateProfile(formData);
            setUser(updatedUser);
            setIsEditing(false);
            toast({
                title: 'Profile Updated',
                description: 'Your account details have been successfully updated.',
            });
        } catch (error: any) {
            toast({
                title: 'Update Failed',
                description: error.message || 'Something went wrong',
                variant: 'destructive'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (isAuthLoading || !_hasHydrated) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-1 py-10">
                <div className="container max-w-5xl">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">My Account</h1>
                            <p className="text-slate-500 mt-1">Manage your profile and orders</p>
                        </div>
                        <Button 
                            variant={isEditing ? "ghost" : "outline"}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Sidebar */}
                        <div className="space-y-6">
                            <Card className="overflow-hidden border-none shadow-sm">
                                <div className="h-24 bg-gradient-to-r from-primary/80 to-pink-500/80" />
                                <CardContent className="relative pt-12 pb-6 text-center">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-white rounded-full shadow-md">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white text-primary">
                                            <User className="h-10 w-10" />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">{user.full_name || 'Customer'}</h2>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                        <Badge variant={user.user_type === 'seller' ? 'secondary' : 'outline'} className="text-[10px] h-4">
                                            {user.user_type}
                                        </Badge>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t flex flex-col gap-2">
                                        <Button variant="outline" className="w-full justify-start gap-2 hover:bg-slate-50 border-slate-200" onClick={() => router.push('/orders')}>
                                            <Package className="h-4 w-4 text-slate-500" /> My Orders
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                                            <LogOut className="h-4 w-4" /> Logout
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* B2B Status Card */}
                            {user.user_type === 'seller' && (
                                <Card className={`border-none shadow-sm ${user.is_verified ? 'bg-green-50' : 'bg-amber-50'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            {user.is_verified ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                            )}
                                            <div>
                                                <p className={`text-sm font-bold ${user.is_verified ? 'text-green-900' : 'text-amber-900'}`}>
                                                    {user.is_verified ? 'Verified Wholesale Member' : 'Wholesale Verification Pending'}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${user.is_verified ? 'text-green-700' : 'text-amber-700'}`}>
                                                    {user.is_verified 
                                                        ? 'You have access to exclusive wholesale pricing.' 
                                                        : 'Our team is reviewing your GST details.'}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Security</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Phone Number</p>
                                            <p className="text-sm font-medium">{user.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Joined</p>
                                            <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-6">
                            {isEditing ? (
                                <Card className="border-none shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Edit Profile Details</CardTitle>
                                        <CardDescription>Update your personal and business information.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="full_name">Full Name</Label>
                                                    <Input 
                                                        id="full_name"
                                                        value={formData.full_name}
                                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                                    />
                                                </div>

                                                <div className="pt-4 border-t">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <input 
                                                            type="checkbox" 
                                                            id="is_b2b"
                                                            checked={formData.user_type === 'seller'}
                                                            onChange={(e) => setFormData({...formData, user_type: e.target.checked ? 'seller' : 'customer'})}
                                                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                        />
                                                        <Label htmlFor="is_b2b" className="text-base font-bold text-slate-900 cursor-pointer">
                                                            I want to register as a B2B Business
                                                        </Label>
                                                    </div>

                                                    {formData.user_type === 'seller' && (
                                                        <div className="grid gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="business_name">Business Name</Label>
                                                                <div className="relative">
                                                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                    <Input 
                                                                        id="business_name"
                                                                        className="pl-10"
                                                                        placeholder="e.g. Acme Cosmetics Ltd"
                                                                        value={formData.business_name}
                                                                        onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                                                                        required={formData.user_type === 'seller'}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="gst_number">GST Number</Label>
                                                                <div className="relative">
                                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                    <Input 
                                                                        id="gst_number"
                                                                        className="pl-10 font-mono"
                                                                        placeholder="22AAAAA0000A1Z5"
                                                                        value={formData.gst_number}
                                                                        onChange={(e) => setFormData({...formData, gst_number: e.target.value.toUpperCase()})}
                                                                        required={formData.user_type === 'seller'}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 italic">
                                                                Note: Switching to Wholesale will require admin verification before wholesale pricing is active.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <Button type="submit" className="flex-1" disabled={isUpdating}>
                                                    {isUpdating ? 'Saving Changes...' : 'Save Profile'}
                                                </Button>
                                                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    {/* Business Details View (if seller) */}
                                    {user.user_type === 'seller' && (
                                        <Card className="border-none shadow-sm overflow-hidden">
                                            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5" />
                                                    <h3 className="font-bold">Business Information</h3>
                                                </div>
                                                <Badge variant={user.is_verified ? 'success' : 'warning'} className="bg-white/10 border-white/20">
                                                    {user.is_verified ? 'VERIFIED' : 'PENDING'}
                                                </Badge>
                                            </div>
                                            <CardContent className="grid sm:grid-cols-2 gap-6 p-6">
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Business Name</p>
                                                    <p className="text-lg font-bold text-slate-900 mt-1">{user.business_name || 'Not provided'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">GST Identification Number</p>
                                                    <p className="text-lg font-mono font-bold text-slate-900 mt-1">{user.gst_number || 'Not provided'}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Recent Orders */}
                                    <Card className="border-none shadow-sm">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <div>
                                                <CardTitle className="text-xl">Recent Orders</CardTitle>
                                                <CardDescription>Your latest purchases</CardDescription>
                                            </div>
                                            <Link href="/orders" className="text-sm text-primary font-bold hover:underline">
                                                View all
                                            </Link>
                                        </CardHeader>
                                        <CardContent>
                                            {isLoadingOrders ? (
                                                <div className="space-y-4 py-4">
                                                    {[1, 2].map((i) => (
                                                        <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : orders.length > 0 ? (
                                                <div className="space-y-3">
                                                    {orders.map((order) => (
                                                        <Link 
                                                            key={order.id} 
                                                            href={`/orders/${order.id}`}
                                                            className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                                    <Package className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900">{order.order_number}</p>
                                                                    <p className="text-xs text-slate-500">{formatDate(order.created_at)} • {order.items?.length ?? 0} items</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right hidden sm:block">
                                                                    <p className="font-bold text-slate-900">{formatPrice(order.total_amount)}</p>
                                                                    <Badge variant="outline" className={`mt-1 text-[10px] ${
                                                                        order.status === 'DELIVERED' ? 'text-green-600 bg-green-50' : 
                                                                        order.status === 'CANCELLED' ? 'text-red-600 bg-red-50' : 
                                                                        'text-blue-600 bg-blue-50'
                                                                    }`}>
                                                                        {order.status}
                                                                    </Badge>
                                                                </div>
                                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 border border-dashed rounded-2xl bg-slate-50/30">
                                                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                                    <p className="text-slate-500 font-medium">No orders yet</p>
                                                    <Link href="/products" className="mt-4 block">
                                                        <Button variant="outline" size="sm">Explore Products</Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Settings Grid */}
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <Card className="border-none shadow-sm hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push('/wishlist')}>
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-pink-50 rounded-xl">
                                                        <User className="h-6 w-6 text-pink-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Wishlist</p>
                                                        <p className="text-xs text-slate-500">Your saved items</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300" />
                                            </CardContent>
                                        </Card>
                                        <Card className="border-none shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-50 rounded-xl">
                                                        <MapPin className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Addresses</p>
                                                        <p className="text-xs text-slate-500">Manage shipping info</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300" />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
