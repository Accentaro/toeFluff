import type { NextConfig } from 'next'

// Static export for GitHub Pages. The site is served from the custom domain in public/CNAME, so no basePath.
const config: NextConfig = {
	output: 'export',
	trailingSlash: true,
	images: { unoptimized: true },
}

export default config
