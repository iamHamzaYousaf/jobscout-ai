/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  /**
   * When NEXT_PUBLIC_API_URL is left empty, the browser calls /api/* on this origin
   * and Next forwards to the FastAPI server (avoids CORS and "wrong host" issues in dev).
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
