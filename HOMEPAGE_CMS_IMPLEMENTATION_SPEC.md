# Homepage CMS Implementation Specification

## 1) Goal

Build a CMS-driven homepage system where non-technical admins can:
- Edit all homepage content (title, heading, subheading, image, video, CTA, lists, cards, etc.)
- Reorder sections
- Enable/disable sections
- Create new homepage sections from reusable section types
- Preview before publish
- Publish changes and see them reflected in the client site in near real-time

This spec is written for the **admin-panel project** so its Cursor AI can generate APIs and admin UI accurately.

---

## 2) Scope

### In scope
- Homepage content modeling
- Section-based dynamic rendering
- Draft/publish workflow
- Versioning and rollback
- Media management references
- Public content delivery API
- Admin CRUD API
- Realtime cache invalidation / update signaling

### Out of scope
- Deep WYSIWYG page-builder with arbitrary drag-drop HTML
- Full design-system/theme editor
- Multi-language (can be added later)

---

## 3) Current homepage sections to model first

The current client homepage (`src/app/page.tsx`) should be represented as CMS section instances. Initial section types:

1. `hero`
2. `impact_stats`
3. `feature_overview` (carousel + side image)
4. `lifeline_features_grid`
5. `coming_soon_wearable`
6. `action_video_mobile`
7. `action_video_desktop`
8. `testimonials` (can map to existing component-backed content)
9. `live_impact_updates`
10. `guides`
11. `community_cta`
12. `footer` (optional as global component, usually not homepage CMS)

Admin must also be able to add **new sections** of supported section types and append anywhere in homepage order.

### 3.1) Canonical schema for existing homepage structure (`home_v1`)

Important: the admin panel must start with this exact structure so edits apply to the current live design without layout drift.

```json
{
  "schemaVersion": "home_v1",
  "page": {
    "slug": "home",
    "title": "Homepage",
    "sections": [
      {
        "sectionKey": "hero_main",
        "type": "hero",
        "order": 1,
        "enabled": true,
        "data": {
          "backgroundVideo": { "url": "/HeroVid.mp4", "posterUrl": "" },
          "overlayEnabled": true,
          "headingLines": [
            "Helping resolve the",
            "Overcoming Disaster :",
            "Using People, Technology & AI"
          ],
          "description": "A disaster management ecosystem that helps people ,through real time Intelligent , connected devices and active people coordination.",
          "newsletterCard": {
            "enabled": true,
            "title": "Please join our newsletter to get latest updates on our launch & offers!"
          },
          "tickerEnabled": true
        }
      },
      {
        "sectionKey": "impact_stats",
        "type": "impact_stats",
        "order": 2,
        "enabled": true,
        "data": {
          "titlePrefix": "The True Cost of",
          "titleHighlight": "Delayed Emergency Response",
          "subtitle": "Disasters don't just destroy infrastructure – they steal time, lives, and hope.",
          "backgroundImage": "/CrisisBG.png",
          "cards": [
            {
              "metric": "$100+",
              "metricLabel": "Billions",
              "title": "Average annual disaster damage in the United States",
              "description": "Climate-driven disasters are increasing in frequency and severity every year."
            },
            {
              "metric": "16,000+",
              "metricLabel": "Lives Lost",
              "title": "In U.S. disasters since 1980",
              "description": "Climate-driven disasters are increasing in frequency and severity every year."
            },
            {
              "metric": "5,000+",
              "metricLabel": "Missing",
              "title": "During floods, hurricanes, fires, and earthquakes",
              "description": "Families lose contact. Responders lack precise location data."
            },
            {
              "metric": "30-40%",
              "metricLabel": "Lost Lives",
              "title": "Could be avoided with faster location, communication, and response",
              "description": "Minutes matter. Technology saves lives."
            }
          ],
          "bottomTagline": "When help is late, R3SULTS shows up!"
        }
      },
      {
        "sectionKey": "features_building",
        "type": "feature_overview",
        "order": 3,
        "enabled": true,
        "data": {
          "titlePrefix": "What we are",
          "titleHighlight": "building?",
          "subtitle": "An easy-to-use disaster management platform that provides comprehensive tools and resources to help you prepare, respond, and recover from any crisis.",
          "carouselEnabled": true,
          "sideImageDesktop": "/IPadImg.webp",
          "sideImageMobile": "/IPadImg.webp"
        }
      },
      {
        "sectionKey": "lifeline_grid",
        "type": "lifeline_features_grid",
        "order": 4,
        "enabled": true,
        "data": {
          "titlePrefix": "Your",
          "titleHighlight": "Lifeline",
          "titleSuffix": "in Crisis",
          "subtitle": "Comprehensive disaster preparedness and response features designed to keep you and your loved ones safe.",
          "items": [
            { "title": "Disaster Alerts", "line1": "AI-powered real-time", "line2": "notifications for imminent", "line3": "threats in your area", "iconKey": "disaster_alerts" },
            { "title": "Shelter Locator", "line1": "AI-powered real-time", "line2": "find nearby safe shelters", "line3": "with live capacity information", "iconKey": "shelter_locator" },
            { "title": "Medical Assistance", "line1": "AI-powered real-time", "line2": "connect with emergency", "line3": "medical services and resources", "iconKey": "medical_assistance" },
            { "title": "Insurance & Relief", "line1": "AI-powered real-time", "line2": "streamline insurance claims", "line3": "and relief program access", "iconKey": "insurance_relief" },
            { "title": "Emergency Supplies", "line1": "AI-powered real-time", "line2": "locate stores for essential", "line3": "supplies and provisions", "iconKey": "emergency_supplies" },
            { "title": "Family Finder", "line1": "AI-powered real-time", "line2": "pinpoint loved ones", "line3": "via GPS or data", "iconKey": "family_finder" },
            { "title": "Damage Reporting", "line1": "AI-powered real-time", "line2": "document and report damage", "line3": "for expedited aid efforts", "iconKey": "damage_reporting" },
            { "title": "Recovery Tracking", "line1": "AI-powered real-time", "line2": "monitor restoration progress", "line3": "and community rebuilding", "iconKey": "recovery_tracking" }
          ],
          "emailPrompt": "Be Disaster-Ready. Subscribe for Launch Updates",
          "emailFormEnabled": true
        }
      },
      {
        "sectionKey": "coming_soon_wearable",
        "type": "coming_soon_wearable",
        "order": 5,
        "enabled": true,
        "data": {
          "revealText": "Revealing soon",
          "productImage": "/WatchImg.png",
          "titleLines": ["IOT-powered Wearable", "for emergency", "tracking"],
          "subtitle": "Join the Early Access Program",
          "emailFormEnabled": true
        }
      },
      {
        "sectionKey": "action_video_mobile",
        "type": "action_video_mobile",
        "order": 6,
        "enabled": true,
        "data": {
          "videoUrl": "/ActionMob.mp4",
          "controls": true
        }
      },
      {
        "sectionKey": "action_video_desktop",
        "type": "action_video_desktop",
        "order": 7,
        "enabled": true,
        "data": {
          "videoUrl": "/Action.mp4",
          "controls": true
        }
      },
      {
        "sectionKey": "testimonials",
        "type": "testimonials",
        "order": 8,
        "enabled": true,
        "data": {
          "mode": "component_managed",
          "componentKey": "TestimonialsSection"
        }
      },
      {
        "sectionKey": "live_impact_updates",
        "type": "live_impact_updates",
        "order": 9,
        "enabled": true,
        "data": {
          "titlePrefix": "Live Impact",
          "titleHighlight": "Updates",
          "subtitle": "Real-time stories from the field, community highlights, and relief operations.",
          "items": [
            {
              "title": "Flash floods devastate coastal cities, emergency services overwhelmed",
              "description": "Floods devastate coastal cities, infrastructure overwhelmed, emergency systems over-stressed.",
              "imageUrl": "/Impact3.jpeg",
              "activeReliefPartners": 12,
              "donationsRaised": 198500
            },
            {
              "title": "Wildfires spread rapidly, communities evacuated",
              "description": "Wildfires spread rapidly, communities evacuated, homes lost and people struggling.",
              "imageUrl": "/Impact1.jpg",
              "activeReliefPartners": 15,
              "donationsRaised": 128300
            },
            {
              "title": "Earthquake strikes urban region, buildings damaged, rescue operations underway",
              "description": "Earthquake strikes urban region, buildings damaged, rescue operations underway.",
              "imageUrl": "/Impact4.jpg",
              "activeReliefPartners": 8,
              "donationsRaised": 450000
            },
            {
              "title": "Hurricane causes widespread power outages, relief efforts mobilized",
              "description": "Hurricane causes widespread power outages, relief efforts mobilized across affected regions.",
              "imageUrl": "/Impact2.jpg",
              "activeReliefPartners": 20,
              "donationsRaised": 320000
            }
          ]
        }
      },
      {
        "sectionKey": "guides",
        "type": "guides",
        "order": 10,
        "enabled": true,
        "data": {
          "mode": "component_managed",
          "componentKey": "GuidesSection"
        }
      },
      {
        "sectionKey": "community_cta",
        "type": "community_cta",
        "order": 11,
        "enabled": true,
        "data": {
          "badgeText": "Our Community",
          "title": "Join our community",
          "description": "Stay connected with the R3sults mission to protect families and responders. Subscribe to receive disaster alert updates, launch announcements, and helpful preparedness content directly in your inbox.",
          "bulletPoints": [
            "Real-time emergency and platform alerts",
            "Product updates, offers, and launch news"
          ],
          "formTitle": "Get email alerts and marketing updates",
          "formDescription": "Click the email field to open the form, verify the code, then tap Join."
        }
      },
      {
        "sectionKey": "footer",
        "type": "footer",
        "order": 12,
        "enabled": true,
        "data": {
          "mode": "component_managed",
          "componentKey": "Footer"
        }
      }
    ]
  }
}
```

Implementation rule for admin panel:
- Keep `schemaVersion = home_v1` as the default model for initial migration.
- Do not rename section keys/types in first rollout.
- Any new custom section added by admin must be appended using a registered `type` with its own schema.

---

## 4) Architecture (recommended)

### Content model strategy
Use a **section registry + JSON payload per section instance**:

- `page` record (homepage)
- ordered `page_sections` records
- each section has:
  - `type` (from registry)
  - `data` JSON validated by schema per type
  - `order_index`
  - `is_enabled`

This gives flexibility and keeps API stable while supporting new section types.

### Rendering strategy in client app
- Client calls public API for homepage payload
- Payload returns ordered enabled sections
- Client maps `section.type -> React renderer component`
- Renderer receives `section.data`
- Unknown/unsupported types are safely skipped with logging

---

## 5) Data model (DB schema proposal)

## `pages`
- `id` (uuid, pk)
- `slug` (unique, e.g. `home`)
- `title`
- `status` (`draft` | `published`)
- `published_version_id` (nullable fk)
- `created_at`, `updated_at`

## `page_versions`
- `id` (uuid, pk)
- `page_id` (fk pages.id)
- `version_number` (int)
- `snapshot_json` (full page + sections snapshot)
- `change_note` (text)
- `created_by` (fk users/admins)
- `created_at`

## `page_sections`
- `id` (uuid, pk)
- `page_id` (fk pages.id)
- `section_key` (unique per page; stable identifier)
- `type` (string enum from registry, e.g. `hero`)
- `label` (admin-friendly name, editable)
- `order_index` (int)
- `is_enabled` (bool)
- `data` (jsonb)
- `created_at`, `updated_at`

## `media_assets` (if admin panel owns uploads)
- `id` (uuid, pk)
- `url`
- `mime_type`
- `alt_text`
- `width`, `height`, `duration_sec` (nullable)
- `size_bytes`
- `created_by`
- `created_at`

## `section_registry` (optional db table; can also be code config)
- `type` (pk)
- `display_name`
- `schema_json` (JSON schema/Zod metadata)
- `is_repeatable`
- `is_active`

---

## 6) API contract

Base path example: `/api/v1/cms`

## Public APIs (client website consumes)

### `GET /public/pages/home`
Returns **published** homepage payload:

```json
{
  "page": {
    "slug": "home",
    "updatedAt": "2026-04-20T10:40:00Z",
    "version": 12
  },
  "sections": [
    {
      "id": "sec_hero_1",
      "type": "hero",
      "order": 1,
      "data": {
        "heading": "Helping resolve the Overcoming Disaster:",
        "subheading": "Using People, Technology & AI",
        "description": "A disaster management ecosystem...",
        "backgroundVideo": { "url": "https://cdn.../HeroVid.mp4" },
        "newsletterCard": {
          "title": "Please join our newsletter...",
          "enabled": true
        },
        "tickerEnabled": true
      }
    }
  ]
}
```

### `GET /public/pages/home?previewToken=...` (optional)
Allows secure preview of draft content.

---

## Admin APIs (admin panel consumes)

### Page + version
- `GET /admin/pages/home`
- `PATCH /admin/pages/home` (basic page metadata)
- `POST /admin/pages/home/publish`
- `POST /admin/pages/home/unpublish` (optional)
- `GET /admin/pages/home/versions`
- `POST /admin/pages/home/rollback/{versionId}`

### Sections
- `GET /admin/pages/home/sections`
- `POST /admin/pages/home/sections` (create new section instance)
- `PATCH /admin/pages/home/sections/{sectionId}` (edit label/enabled/data)
- `DELETE /admin/pages/home/sections/{sectionId}`
- `POST /admin/pages/home/sections/reorder` (bulk order update)

### Registry + schema
- `GET /admin/section-types` (returns available section types + JSON schema + defaults)

### Media
- `POST /admin/media/upload`
- `GET /admin/media`
- `DELETE /admin/media/{mediaId}`

---

## 7) Section schema definitions (minimum)

Use strict validation (Zod/JSON Schema) on each section's `data`.

## `hero`
- `heading` (string, required)
- `subheading` (string, required)
- `description` (string)
- `backgroundVideo` (object: `url`, `posterUrl?`)
- `primaryCta` (`label`, `url`, `enabled`)
- `secondaryCta` (`label`, `url`, `enabled`)
- `newsletterCard` (`enabled`, `title`)
- `tickerEnabled` (bool)

## `impact_stats`
- `title` (string)
- `highlightText` (string)
- `subtitle` (string)
- `backgroundImage` (`url`)
- `cards` (array, min 1)
  - `metric`
  - `metricLabel`
  - `title`
  - `description`

## `lifeline_features_grid`
- `title`
- `subtitle`
- `items` (array; each item has `title`, `line1`, `line2`, `line3`, `icon` or `iconName`)
- `newsletterPrompt`
- `newsletterEnabled`

## `live_impact_updates`
- `title`
- `subtitle`
- `items` array
  - `title`
  - `description`
  - `image.url`
  - `activeReliefPartners` (number)
  - `donationsRaised` (number)

## `community_cta`
- `badgeText`
- `title`
- `description`
- `bulletPoints` (array of strings)
- `formTitle`
- `formDescription`

Important: every section type must define:
- `defaultData`
- `validation schema`
- `admin form config` (labels, help text, input types)

---

## 8) Admin panel UX requirements

## Homepage builder screen
- Left: ordered section list (drag-and-drop reorder)
- Right: selected section editable form
- Top actions: Save Draft, Preview, Publish, Rollback

## Each section row
- Type badge
- Editable label
- Toggle enable/disable
- Duplicate section
- Delete section

## Add section flow
- Click "Add Section"
- Modal shows available section types from `/admin/section-types`
- Choose type -> create section with `defaultData`
- New section added at end (can reorder)

## Validation UX
- Block save/publish for invalid schema
- Show field-level errors
- Show media constraints (size, format, resolution)

---

## 9) Publish workflow

1. Admin edits draft sections
2. Save draft (autosave optional)
3. Preview draft via secure preview URL/token
4. Publish action:
   - Validate all enabled sections
   - Create `page_versions` snapshot
   - Mark version as current published
   - Trigger cache invalidation + realtime event

---

## 10) Realtime update strategy

Since client app will integrate later and should reflect changes quickly:

- Preferred:
  - Publish triggers webhook/event (`homepage.published`)
  - Client site invalidates cache/tag and refetches
  - Optional websocket/SSE for live preview environments

- Practical with Next.js:
  - API route cache tags (e.g. `home-page`)
  - Publish endpoint calls revalidate mechanism for that tag/path
  - Client fetch uses `next: { tags: ['home-page'] }` or short revalidate

Expected result: updates visible within seconds after publish.

---

## 11) Security and permissions

- Admin APIs require authenticated admin JWT/session
- Role-based access:
  - `content_editor`: edit draft
  - `publisher`: can publish/rollback
  - `admin`: full access
- Public endpoint returns only published content
- Preview endpoint requires secure short-lived token
- Sanitize rich text fields to prevent XSS

---

## 12) Non-functional requirements

- **Performance:** public homepage payload < 300KB preferred
- **Availability:** public API must fail-safe (return last published snapshot)
- **Auditability:** track who changed what and when
- **Resilience:** preserve previous published version for rollback
- **Backward compatibility:** unknown section types do not break page rendering

---

## 13) Client integration contract (for this frontend project later)

When admin panel APIs are ready, this frontend will:
- Replace hardcoded homepage content in `src/app/page.tsx`
- Fetch `/public/pages/home`
- Render sections dynamically using a section renderer map
- Keep existing visual components but pass CMS data props
- Fallback to safe defaults if API unavailable

Suggested renderer map example:
- `hero` -> `HeroSectionRenderer`
- `impact_stats` -> `ImpactStatsRenderer`
- `lifeline_features_grid` -> `LifelineGridRenderer`
- `live_impact_updates` -> `LiveImpactRenderer`
- etc.

---

## 14) Acceptance criteria (must pass)

1. Admin can edit text/image/video/CTA fields for all existing homepage sections.
2. Admin can add a new section instance and place it anywhere.
3. Admin can enable/disable sections and reorder sections.
4. Invalid section data cannot be published.
5. Publish creates a version snapshot and audit log.
6. Public API returns only published content in correct order.
7. Client reflects published changes without code changes and with near real-time cache refresh.
8. Rollback to previous version works.

---

## 15) Suggested implementation phases

## Phase 1 (foundation)
- Create DB schema
- Create section registry
- Implement public + admin read APIs

## Phase 2 (editing)
- Implement section CRUD + reorder
- Add validation and media upload
- Add draft save

## Phase 3 (publishing/realtime)
- Add publish + version snapshots + rollback
- Add cache revalidation/event hooks
- Add preview mode

## Phase 4 (hardening)
- Add RBAC, audit log, tests, rate limits

---

## 16) Test checklist

- Unit tests for section schema validators
- API tests for section CRUD/reorder/publish
- Permission tests by role
- Publish and rollback integration test
- Public endpoint contract tests
- Performance test on large section payload
- Client smoke test with dynamic payload

---

## 17) Notes for admin-panel Cursor AI

When generating code:
- Use strict typed schemas per section type
- Keep section renderer decoupled from storage details
- Do not hardcode section fields in generic APIs
- Return predictable API envelope with version + sections
- Build for future extensibility (new section types without breaking old ones)

This CMS design intentionally balances flexibility (new section creation) with controlled structure (typed section schemas) so non-technical admins can safely manage the homepage end-to-end.
