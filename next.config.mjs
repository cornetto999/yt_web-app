/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'yt3.ggpht.com',
      'i.ytimg.com',
      'i9.ytimg.com',
      'lh3.googleusercontent.com',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i9.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
