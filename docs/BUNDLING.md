# Frontend Bundling Architecture Guide

This document provides an in-depth guide to modern frontend bundling, specifically tailored for the Soul Lab project.

## Table of Contents

1. [Module Systems Evolution](#module-systems-evolution)
2. [Bundler Comparison](#bundler-comparison)
3. [Optimization Strategies](#optimization-strategies)
4. [Soul Lab Configuration](#soul-lab-configuration)
5. [Module Federation](#module-federation)

---

## Module Systems Evolution

### CommonJS (CJS)
```javascript
// Synchronous, Node.js standard
const module = require('./module');
module.exports = { foo };
```
- Designed for server-side (Node.js)
- Synchronous loading - blocks execution
- Cannot be statically analyzed

### ES Modules (ESM)
```javascript
// Static, browser-native standard
import { foo } from './module';
export const bar = 1;
```
- Language-level standard (ES2015+)
- Static analysis enables tree shaking
- Async loading, browser-native support
- **Soul Lab uses ESM exclusively**

---

## Bundler Comparison

| Feature | Webpack | Vite | Rollup | Turbopack |
|---------|---------|------|--------|-----------|
| Language | JavaScript | JavaScript | JavaScript | Rust |
| Dev Server | Full bundle | Native ESM | N/A | Lazy bundle |
| HMR Speed | O(n) | O(1) | N/A | O(1) |
| Production | Highly configurable | Uses Rollup | Flat bundles | Webpack-compatible |
| Use Case | Enterprise/Legacy | Modern SPA | Libraries | Next.js/Large apps |

### Why Vite for Soul Lab?

1. **Instant Dev Server**: Native ESM eliminates bundling during development
2. **Fast HMR**: File-level updates, not app-level rebuilds
3. **Optimized Production**: Rollup-based with tree shaking and code splitting
4. **Simple Configuration**: Sensible defaults, minimal setup

---

## Optimization Strategies

### 1. Tree Shaking

Removes unused code from the final bundle.

**Requirements:**
- ESM syntax (`import`/`export`)
- `sideEffects` field in package.json
- Avoid barrel files with side effects

```json
// package.json
{
  "sideEffects": [
    "**/*.css",
    "./src/lib/analytics.ts"
  ]
}
```

### 2. Scope Hoisting

Flattens module structure to reduce function call overhead.

**Before (wrapped):**
```javascript
function module1() { return { foo: 1 }; }
function module2() { return module1().foo; }
```

**After (hoisted):**
```javascript
const foo = 1;
const result = foo;
```

### 3. Code Splitting

Divides code into chunks loaded on demand.

**Route-based splitting (React):**
```typescript
const Page = lazy(() => import('./pages/Page'));

<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

**Manual chunks (Rollup):**
```typescript
// vite.config.ts
manualChunks(id) {
  if (id.includes('node_modules/react')) {
    return 'vendor';
  }
}
```

### 4. Compression

Reduce transfer size with gzip/brotli.

| Format | Compression | Browser Support |
|--------|-------------|-----------------|
| Gzip | ~70% | Universal |
| Brotli | ~75-80% | Modern browsers |

---

## Soul Lab Configuration

### Current Setup

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React ecosystem
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor';
          }
          // Fortune data: templates
          if (id.includes('fortuneTemplates')) return 'fortune-data';
          // Core utils: seed, analytics
          if (id.includes('src/lib/seed')) return 'core-utils';
        },
      },
    },
  },
  esbuild: {
    drop: ['debugger'],
    charset: 'utf8',
  },
});
```

### Chunk Structure

| Chunk | Contents | Load Timing |
|-------|----------|-------------|
| `vendor` | React, React-DOM, React-Router | Initial |
| `core-utils` | seed, attribution, analytics | Initial |
| `fortune-data` | Fortune templates, copy variants | On demand |
| `tarot-data` | Tarot cards, engine | Tarot page |
| `reward-utils` | Reward, streak logic | Result page |
| Page chunks | Individual page components | Route navigation |

### Bundle Size Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial JS (brotli) | < 60KB | ~55KB |
| Largest chunk | < 50KB | ~45KB |
| Total JS | < 250KB | ~200KB |

### Prefetch Strategy

```typescript
// App.tsx - usePrefetch hook
useEffect(() => {
  if (location.pathname === '/') {
    import('./pages/AgreementPage'); // Prefetch next page
  }
}, [location.pathname]);
```

---

## Module Federation

### When to Use

Module Federation enables runtime code sharing between independently deployed applications.

**Good candidates:**
- Admin dashboards (separate auth, infrequent access)
- Feature flags/experiments
- Shared component libraries

**Poor candidates:**
- Tightly coupled features (Credits + Result page)
- Small, fast-loading modules (already lazy-loaded)

### Soul Lab Consideration

Currently, only **Admin Dashboard** is a viable MFE candidate:

```typescript
// Future: apps/admin/vite.config.ts
import federation from '@originjs/vite-plugin-federation';

federation({
  name: 'admin',
  exposes: {
    './AdminPage': './src/AdminPage.tsx',
  },
  shared: ['react', 'react-dom'],
});
```

**Not recommended for MFE:**
- Tarot (already lazy-loaded, small)
- Chemistry/Result (shared credits system)
- Consult (IAP dependency)

---

## Monitoring & Analysis

### Bundle Analysis

```bash
# Generate stats.html
pnpm build:web

# Opens interactive treemap
# - Identify large chunks
# - Find duplicate dependencies
# - Track size over time
```

### Performance Metrics

Track these in CI/CD:

```yaml
# .github/workflows/bundle-check.yml
- name: Check bundle size
  run: |
    pnpm build:web
    # Fail if initial JS > 80KB (brotli)
    size=$(stat -f%z dist/assets/index-*.js.br)
    if [ $size -gt 81920 ]; then exit 1; fi
```

---

## References

- [Vite Documentation](https://vitejs.dev/)
- [Rollup Plugin API](https://rollupjs.org/plugin-development/)
- [Module Federation](https://module-federation.io/)
- [Web Performance Working Group](https://www.w3.org/webperf/)
