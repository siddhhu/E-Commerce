/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.in',
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                // WooCommerce imported product images
                protocol: 'https',
                hostname: 'pranjay.com',
            },
            {
                protocol: 'http',
                hostname: 'pranjay.com',
            },
            {
                protocol: 'https',
                hostname: 'www.pranjay.com',
            },
        ],
    },
    ...(process.env.NEXT_PUBLIC_API_URL && {
        async rewrites() {
            return [
                {
                    source: '/api/:path*',
                    destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
                },
            ];
        },
    }),
};

module.exports = nextConfig;
