/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@alemedu/ui", "@alemedu/validation", "@alemedu/api-client", "@alemedu/config"],
};

module.exports = nextConfig;
