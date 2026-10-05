import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Browser compatibility floor: Chrome 87 / Edge 88 / Firefox 78 / Safari 14
// (2020-2021 era engines, covers most old-WebView "shell" browsers).
// Tailwind v4 emits oklch() colors inside @layer blocks — engines that
// understand neither silently drop EVERY rule ("all CSS is broken"), and
// engines between the two thresholds lose every color. Lightning CSS lowers
// both at build time: layers are flattened and oklch() becomes rgb().
const CSS_TARGETS = {
  chrome: 87 << 16,
  edge: 88 << 16,
  firefox: 78 << 16,
  safari: 14 << 16,
};

// Lightning CSS lowers oklch()/color-mix() but deliberately keeps cascade
// @layer blocks. Ancient engines (Chrome<99 / Safari<15.4 / Firefox<97, plus
// old-WebView shell browsers) drop ENTIRE layers they don't understand —
// the page renders with zero styling. This PostCSS pass lifts every rule out
// of its @layer so nothing is ever lost; the bundle's physical order
// (theme -> properties -> base -> components -> utilities) keeps the same
// cascade intent for equal-specificity conflicts.
const flattenLayersPlugin = {
  postcssPlugin: 'flatten-css-layers',
  AtRule: {
    layer(atRule: any) {
      if (!atRule.nodes) {
        atRule.remove(); // bare " @layer a; " ordering declaration
        return;
      }
      for (const child of [...atRule.nodes]) {
        atRule.parent.insertBefore(atRule, child);
      }
      atRule.remove();
    },
  },
};
// NOTE: object-style PostCSS plugins must NOT set `postcss: true` —
// that flag marks *function* factories and makes postcss call the object,
// which throws "i is not a function". `postcssPlugin` alone is enough.

function flattenCssLayers(): Plugin {
  return {
    name: 'flatten-css-layers',
    apply: 'build',
    // Runs on the final bundled CSS assets (post Tailwind expansion and
    // Lightning CSS lowering/minify), so nothing can bypass the flattening.
    generateBundle(_options, bundle) {
      for (const key of Object.keys(bundle)) {
        const asset = bundle[key];
        if (asset.type !== 'asset' || !key.endsWith('.css')) continue;
        const css =
          typeof asset.source === 'string'
            ? asset.source
            : Buffer.from(asset.source).toString('utf-8');
        if (!css.includes('@layer')) continue;
        const result = postcss([flattenLayersPlugin]).process(css, {
          from: key,
        });
        asset.source = result.css;
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), flattenCssLayers()],
    // Relative asset base so the build works when hosted under a sub-path
    // (e.g. GitHub Pages project sites at <user>.github.io/<repo>/).
    // Absolute '/assets/...' URLs 404 in that context and render a blank page.
    base: './',
    css: {
      transformer: 'lightningcss' as const,
      lightningcss: {
        targets: CSS_TARGETS,
      },
    },
    build: {
      // Same floor for JS syntax: esbuild transpiles optional chaining,
      // logical assignment, class fields, etc. down to this baseline.
      target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
      cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
    },
    resolve: {
      // Use import.meta.dirname (ESM-safe); __dirname is unavailable in native ESM.
      alias: {
        '@': path.resolve(import.meta.dirname ?? process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
