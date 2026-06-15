import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  turbopack: {},
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "salon-saas",
  project: "salon-saas",
});
