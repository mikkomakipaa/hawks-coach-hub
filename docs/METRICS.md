# Metrics & Performance Targets

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Performance Metrics

### Load Performance

| Metric                        | Target                           | Measurement Method              |
| ----------------------------- | -------------------------------- | ------------------------------- |
| Initial load (uncached)       | < 5 seconds to first file card   | Playwright timer                |
| Cached load (within 5 min)    | < 200ms                          | `performance.now()` in app      |
| Tab switch                    | < 100ms                          | `performance.now()` in app      |
| Browse search response        | < 100ms                          | `performance.now()` in app      |
| Drill catalog search response | < 250ms including 150ms debounce | Playwright + mocked planner API |
| File action (open)            | < 500ms                          | User perception                 |

### API Performance

| Metric                       | Target                            |
| ---------------------------- | --------------------------------- |
| `/api/drive` cold response   | < 3 seconds                       |
| `/api/drive` cached response | < 100ms (if server caching added) |
| Vercel serverless cold start | < 2 seconds                       |

### Bundle Size

| Asset                | Target                                     |
| -------------------- | ------------------------------------------ |
| JavaScript (gzipped) | < 100 KB                                   |
| CSS (gzipped)        | < 20 KB                                    |
| Total page weight    | < 200 KB (excluding Drive file thumbnails) |

---

## Performance Monitoring in App

The `PerformanceMonitor` utility (`src/utils/performance-monitor.ts`) logs timings in development for browse-mode work:

```
⚡ Loaded 127 files, 14 folders in 4823ms (from Google Drive)
⚡ Tab switch: 12ms
⚡ Search "harjoitus": 8ms (23 results)
```

In production, timings are still available in browser performance tooling, but the drill catalog route is currently measured through regression tests instead of `PerformanceMonitor` because it intentionally debounces outbound API requests.

---

## Future Observability (Not Yet Implemented)

### What to Track (if analytics added)

- Page load time per session (aggregate, no PII)
- Cache hit rate (what % of loads were cached)
- Most-searched terms (aggregate)
- Most-opened file types (aggregate, no file names)
- Error rate on Drive API calls

### What NOT to Track

- Individual coach identity
- Specific files accessed per user
- Personal data of any kind

### Tooling Options

- Vercel Analytics (built-in, privacy-friendly)
- Simple `fetch` to a logging endpoint
- No third-party analytics requiring consent banners

---

## Health Indicators

| Signal                | Healthy      | Investigate      |
| --------------------- | ------------ | ---------------- |
| Drive API errors      | < 1%         | > 5%             |
| Load time             | < 5s         | > 10s            |
| JS console errors     | 0            | Any on main flow |
| Build size regression | < 10% growth | > 20% growth     |

---

## Benchmarks (Historical)

| Date                               | Load time (uncached)  | Files loaded    | Notes                                  |
| ---------------------------------- | --------------------- | --------------- | -------------------------------------- |
| 2025-08 (pre-optimization)         | ~30 seconds           | ~100            | Sequential API calls                   |
| 2025-11 (post-optimization)        | ~5 seconds            | ~127            | Parallel batch loading                 |
| Subsequent loads (cached)          | <200ms                | —               | In-memory cache                        |
| 2026-02 planner hardening baseline | <250ms catalog settle | 2 mocked drills | Includes current 150ms debounce budget |
