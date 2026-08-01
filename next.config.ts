import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ... any other config options you already had in there
};

// Wrapping is safe even without Sentry configured — it only actually
// uploads source maps / adds instrumentation when a DSN + org/project are
// set. Fill in org/project once you create a Sentry project.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});