# PropertyOps Hub

## Purpose

PropertyOps Hub is a standalone property and facility operations platform for managing non-Pizza Hut properties, including:

- Residential rentals
- Strip malls / multi-tenant commercial properties
- Freestanding commercial properties
- Leased properties
- Other non-restaurant real estate and facilities

PropertyOps is an independent application. AssetOps is a reference implementation only.

## Hard Boundaries

- Do not create any runtime dependency on AssetOps.
- Do not integrate with Freshdesk.
- Do not integrate with Snipe-IT.
- Do not copy Pizza Hut-specific business logic, terminology, schemas, or workflows.
- Do not clone the AssetOps repository wholesale.
- AssetOps may be inspected only as a reference for architecture and proven patterns.
- Use real database migrations from the beginning.
- Use centralized authentication and authorization.
- Use a real role/capability model rather than boolean permission columns.
- All core business records must support organization scoping.
- Keep application modules separated by domain.
- Avoid monolithic page components.
- Maintain a current `.env.example`.
- Use vendor-neutral naming internally.
- Keep third-party integrations isolated and optional.
- Do not expand beyond the currently authorized PROP build order.

## Architecture Principles

- Separate Vercel project
- Separate database
- Separate Blob/file storage
- Separate environment variables and secrets
- Separate domain
- Independent authentication/session data
- No cross-database queries to AssetOps
- No shared runtime services with AssetOps unless explicitly approved later

The intended production domain is:

`propertyops.lawassetgroup.com`

## Product Direction

PropertyOps should be designed so it can serve our internal property portfolio first while preserving a reasonable future path toward being a packaged product.

Do not overbuild full SaaS multi-tenancy during early phases, but avoid architectural decisions that unnecessarily prevent future multi-organization support.

## Core Product Domains

Planned major domains include:

1. Platform foundation
2. Property profiles
3. Native work orders/tickets
4. Equipment management
5. Asset management
6. Notifications and workflows
7. Future property-management features

## Equipment vs. Assets

Treat these as separate concepts.

### Equipment

Equipment is operationally attached to a property.

Examples:

- HVAC units
- Water heaters
- Electrical systems
- Rooftop units
- Pumps
- Building systems
- Exterior/common-area equipment

Equipment has maintenance, condition, service history, and replacement lifecycle.

### Assets

Assets are organization-owned tracked items that may be assigned or moved.

Examples:

- Computers
- Tablets
- Vehicles
- Tools
- Key sets
- Access devices
- Portable equipment

Assets have custody, assignment, transfer, onboarding/offboarding, return, and disposal history.

## Documentation

The PROP-0 discovery and portability report is located at:

`docs/PROP-0-PORTABILITY-REPORT.md`

Read it before beginning implementation work.

If documentation conflicts with actual implementation, report the conflict.

## Development Workflow

Before implementing an authorized build order:

1. Read this file.
2. Read the applicable project documentation.
3. Inspect the current codebase.
4. Produce a concise implementation plan.
5. Stay strictly within the authorized scope.
6. Implement and test.
7. Run lint, typecheck, build, and applicable tests.
8. Do not silently broaden scope.

At the end of every build, report:

- Summary of work completed
- Files created or changed
- Database/schema changes
- New environment variables
- Infrastructure/configuration changes
- Test/build results
- Manual verification steps
- Known limitations
- Recommended next step

## Build Order Discipline

PROP build orders are authorization boundaries.

Do not begin later phases early.

If a future improvement is discovered while working on the current phase, document it as a recommendation rather than implementing it unless it is required to safely complete the authorized phase.