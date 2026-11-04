# Architecture Decision Record: Hawks Coach Hub Static Content Integration

## ADR-001: Hybrid Static + Dynamic Content Architecture

**Date**: 2025-01-23
**Status**: Proposed
**Context**: Need to integrate static content management while preserving Google Drive functionality

### Decision

Implement a hybrid architecture using Astro + Strapi + Supabase for static content, while maintaining Google Drive API for dynamic coach uploads.

### Rationale

- **Performance**: Static content loads 3-4x faster than API-driven content
- **SEO**: Static pages provide better search engine visibility
- **Cost**: Free tiers of Supabase + Vercel stay within $25/month budget
- **Maintenance**: Structured content in CMS vs unorganized Drive folders
- **User Experience**: Unified search across both content sources

### Consequences

**Positive:**

- Improved page load times (target: < 2s vs current ~4s)
- Better content organization and discoverability
- Multilingual support with proper i18n
- Enhanced mobile experience
- Future-proof architecture

**Negative:**

- Increased complexity during transition period
- Need for content migration effort
- Two systems to maintain initially
- Learning curve for content managers

### Alternatives Considered

1. **Pure Static (Astro only)**: Would lose dynamic upload capability
2. **Pure Dynamic (keep current)**: Performance and SEO limitations
3. **Headless CMS only**: More expensive, over-engineered for use case

---

## ADR-002: Content Classification Strategy

**Date**: 2025-01-23
**Status**: Proposed

### Decision

Classify content based on stability and usage patterns:

- **Static**: Training drills, tactics, templates (high reuse, stable)
- **Dynamic**: Coach uploads, session plans (personal, frequently changing)

### Rationale

- Static content benefits from build-time optimization
- Dynamic content needs real-time access and personal organization
- Clear separation simplifies migration and maintenance

---

## ADR-003: Technology Stack Selection

**Date**: 2025-01-23
**Status**: Proposed

### Decision Stack

- **Frontend**: Astro 4.x (static generation) + React islands (interactivity)
- **CMS**: Strapi v4 (self-hosted on Supabase)
- **Database**: Supabase PostgreSQL
- **Hosting**: Vercel (static) + Supabase (API)
- **Storage**: Supabase Storage (assets) + Google Drive (dynamic files)

### Rationale

- **Astro**: Best-in-class performance for content sites, TypeScript support
- **Strapi**: Mature, flexible CMS with good i18n support
- **Supabase**: Cost-effective PostgreSQL with real-time features
- **Vercel**: Excellent Astro integration, generous free tier

### Cost Analysis

| Service          | Free Tier Limits                            | Projected Usage            | Monthly Cost   |
| ---------------- | ------------------------------------------- | -------------------------- | -------------- |
| Supabase         | 500MB DB, 1GB storage, 2GB bandwidth        | Small team, ~100MB content | $0             |
| Vercel           | 100GB bandwidth, 1000 serverless executions | Static site + API routes   | $0             |
| Supabase Storage | 1GB                                         | Images/media assets        | $0-5           |
| **Total**        |                                             |                            | **$0-5/month** |

---

## ADR-004: Migration Strategy

**Date**: 2025-01-23
**Status**: Proposed

### Decision

Implement phased migration over 14 weeks:

1. **Foundation** (2 weeks): Setup infrastructure
2. **Core Content** (4 weeks): Migrate 20 most-used items
3. **Integration** (4 weeks): Unified search and UX
4. **Production** (4 weeks): Complete migration and deployment

### Rationale

- Reduces risk through incremental delivery
- Allows user feedback incorporation
- Maintains service continuity
- Enables rollback at any phase

---

## ADR-005: Content Management Workflow

**Date**: 2025-01-23
**Status**: Proposed

### Decision

Implement dual workflow:

- **Structured Content**: Strapi CMS with review/approval process
- **Quick Uploads**: Direct to Google Drive with auto-categorization

### Rationale

- Balances quality control with ease of use
- Accommodates different coach technical skill levels
- Maintains existing quick upload workflow
- Ensures content quality for published materials

### Workflow Diagram

```
Coach Content Creation
├── Structured (Templates, Drills, Tactics)
│   └── Strapi CMS → Review → Publish → Static Site
└── Quick Upload (Session Plans, Personal Files)
    └── Google Drive → Auto-categorize → Available Immediately
```
