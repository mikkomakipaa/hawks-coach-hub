# Design Improvement Log

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28
**Purpose**: Track design decisions, A/B comparisons, and improvement proposals

---

## Active Improvements

### DI-001: Mobile Layout Optimization (2026-02)

**Problem**: File card layout broke on small mobile screens (<375px); metadata text overflowed.

**Solution**: Switched from CSS grid to flex column layout on mobile. File name truncates with ellipsis. Action buttons always visible at right edge.

**Status**: Implemented ✅

---

### DI-002: Skeleton Loading Cards (2026-02)

**Problem**: Blank white space during initial 5-second load felt like a broken page.

**Solution**: Animated skeleton cards (gray pulse animation) displayed immediately while Drive API loads.

**Status**: Implemented ✅

---

### DI-003: Scrollbar Visibility (2026-02)

**Problem**: Horizontal tab scroll not obvious on mobile — coaches didn't discover all tabs.

**Solution**: Added visible scrollbar indicator below tab row on mobile; `scroll-snap` for smoother tab scrolling.

**Status**: Implemented ✅

---

## Proposed Improvements (Backlog)

### DI-P01: Recently Modified Files Section

**Problem**: Coaches can't quickly see what's new since their last session.

**Proposal**: "Uusimmat" section at top showing last 5 modified files (sorted by `modifiedTime`).

**Effort**: S (data already available in Drive API response)

---

### DI-P02: Persistent Session Selection

**Problem**: File selection is lost on page refresh or tab switch.

**Proposal**: Store selected file IDs in `sessionStorage` so selection survives tab navigation.

**Effort**: XS

---

### DI-P03: File Type Icons

**Problem**: Generic document emoji doesn't distinguish between PDFs, videos, Google Docs clearly enough.

**Proposal**: Inline SVG icons per MIME type with Hawks-themed colors (red for PDF, etc.).

**Effort**: S

---

### DI-P04: Folder Count Indicator

**Problem**: Folder cards don't show how many files they contain at a glance.

**Proposal**: Display `(N tiedostoa)` below folder name on folder cards.

**Effort**: XS (folder child count already in folderCache)

---

## Design Decisions Log

| Date    | Decision                  | Rationale                                 |
| ------- | ------------------------- | ----------------------------------------- |
| 2025-08 | No framework (vanilla TS) | Smaller bundle, faster load               |
| 2025-11 | Parallel batch loading    | 5x performance improvement                |
| 2026-02 | MiniSearch for search     | Fuzzy matching, <8KB library              |
| 2026-02 | 5-min cache TTL           | Balance freshness vs. API quota           |
| 2026-02 | Finnish UI language       | Target users are Finnish-speaking coaches |
