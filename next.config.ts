import path from "node:path";

const nextConfig = {
  // Force Next to treat this folder as the workspace root for file tracing.
  // Prevents the warning when other lockfiles exist above this project.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
