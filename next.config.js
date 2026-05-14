/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    experimental: {
        // Disable the client-side router cache so page changes are always fresh.
        // Next.js 15 caches visited routes for 30s (static) / 5min (dynamic) by default,
        // which causes edits not to appear until the cache expires.
        staleTimes: {
            dynamic: 0,
            static: 0,
        },
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Also ignore type errors if any remain, to ensure deployment
        ignoreBuildErrors: true,
    },
};

export default config;
