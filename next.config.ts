import type { NextConfig } from "next";

// Muqovalar Supabase Storage'dan keladi. Loyiha manzilini aniq ruxsat etamiz.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  // GramJS (Telegram MTProto) Node modullari bilan ishlaydi — bundlerga kiritmaymiz
  serverExternalPackages: ["telegram"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabase
        ? [
            {
              protocol: supabase.protocol.replace(":", "") as "http" | "https",
              hostname: supabase.hostname,
              port: supabase.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    // Lokal sinovda (localhost) rasm optimizatsiyasi xususiy manzilni bloklaydi
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production" || supabase?.hostname === "localhost",
  },
};

export default nextConfig;
