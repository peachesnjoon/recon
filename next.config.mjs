/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
    allowedDevOrigins: ['192.168.50.18'],
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '10mb' },
  },
}

export default nextConfig