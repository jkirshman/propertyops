# POLISH-4 — External Document Links / SharePoint Support

## 1. Objective

Allow PropertyOps to reference documents that remain stored externally
(primarily SharePoint) alongside the existing uploaded-file (private Blob)
capability, without building any SharePoint API synchronization or requiring
Microsoft Graph integration.

## 2. Why This Phase Exists

Today, `files` is the only document concept in PropertyOps: validate → upload
to private Vercel Blob → authenticated streaming route. That is correct and
sufficient for documents that should live inside PropertyOps. But the
business already keeps many documents (leases, insurance certificates,
franchise/ownership paperwork, vendor contracts) in SharePoint, where they are
actively edited and version-controlled by people outside PropertyOps.
Forcing every such document to be re-uploaded into PropertyOps as a static
Blob copy would immediately go stale. PropertyOps needs a second, lightweight
document source: a stable reference to where a document already lives.

## 3. Current-State Observations

- `files` (`src/db/schema.ts:177`): `id`, `organizationId`,
  `uploadedByUserId`, `fileName`, `mimeType`, `sizeBytes`, `blobPathname`,
  `relatedEntityType`, `relatedEntityId`, `title`, `createdAt`. Every column
  assumes a real uploaded binary (`mimeType`, `sizeBytes`, `blobPathname` are
  all `notNull()`) — this table's shape cannot represent an external link
  without either making those columns nullable (weakening the guarantee that
  every `files` row is a real Blob object) or adding a second table.
- `src/lib/files/related-entity-rules.ts` already defines the
  capability-gating map (`RELATED_ENTITY_FILE_RULES`) keyed by entity type
  string, currently covering: `property`, `work_order`, `property_equipment`,
  `asset`, `vendor`, `compliance`, `tenant`, `lease`. This is the exact
  extension point External Document Links should plug into, so both document
  sources share one authorization model per entity type rather than each
  route re-implementing its own gating.
- `src/lib/files/validation.ts` validates upload constraints (size/count/MIME
  allowlist) specific to real binary uploads — none of this applies to an
  external link, which has no bytes to validate, only a URL.
- No URL-safety validation utility exists yet in the codebase (no
  allowed-scheme check function found) — this phase must add one.

## 4. Required Behavior

- Two coexisting document sources, both attachable to the same set of
  entities:
  1. **PropertyOps Uploaded File** — the existing `files`/Blob mechanism,
     unchanged.
  2. **External Document Link** — a new, lightweight reference record.
- An External Document Link stores: display/document name (required),
  external URL (required), document category/type (required, reusing
  whatever category vocabulary the attaching entity's file UI already
  presents, or a small independent fixed list if none exists cleanly — see
  Section 5), description (optional), the related entity
  (Property / Lease / Tenant / Vendor / Property Component / other
  file-registered entity — see Section 5 for exactly which), created-by
  (user), created date, and an active/archived state.
- **PropertyOps stores the stable external URL only.** It never downloads,
  mirrors, or duplicates the externally-linked file into Blob storage,
  automatically or otherwise. Opening an External Document Link from
  PropertyOps opens the external URL directly (new tab), it does not proxy or
  stream the external content through PropertyOps.
- The file can be updated/replaced in SharePoint (or wherever it lives)
  without requiring the PropertyOps record to be recreated, **provided the
  external link remains valid** — PropertyOps does not track or verify that
  validity beyond basic URL-shape validation at save time; ongoing link
  health is not monitored by this phase (see Section 12).
- **No SharePoint API synchronization.** No Microsoft Graph integration. No
  scheduled job to check link health, fetch metadata, or list SharePoint
  folder contents. The user pastes a URL; PropertyOps stores it.
- **Security**:
  - External URLs must be validated against an **allowlist of safe schemes**:
    `https:` only (reject `http:`, `javascript:`, `data:`, `file:`, and any
    other scheme). Decided: `https:`-only, not `http:`-permitted, since
    SharePoint and every realistic target for this feature is HTTPS, and
    permitting plain `http:` adds risk for no real use case.
  - No further allowlisting of specific hostnames (e.g. requiring
    `*.sharepoint.com`) — the feature is named for its primary use case but
    must not hard-code a single vendor's domain, since "SharePoint support"
    should not silently become "SharePoint-only" if a document legitimately
    lives elsewhere (e.g. a public regulatory filing URL).
  - Authorization on the PropertyOps record (who can create/view/edit/
    archive an External Document Link) is enforced exactly like every other
    entity — via the existing capability model and `RELATED_ENTITY_FILE_RULES`
    extension. **Actual access to the external document itself remains fully
    governed by SharePoint/Microsoft's own permissions** — PropertyOps grants
    no additional access to the external system and cannot enforce anything
    beyond its own record-level visibility.

## 5. Data/Model Implications

New table, **not** an extension of `files` (per Section 3's reasoning — the
column shapes and guarantees are fundamentally different):

- `external_document_links`: `id`, `organizationId`, `name` (required text,
  the display/document name), `url` (required text, validated `https:`-only
  at write time), `documentType` (text — reuse each domain's existing
  category concept where one exists, otherwise a small fixed list:
  `lease`, `insurance`, `contract`, `compliance`, `financial`, `other`),
  `description` (nullable text), `relatedEntityType` (text, same convention
  as `files.relatedEntityType`), `relatedEntityId` (text, same convention as
  `files.relatedEntityId`), `createdByUserId` (nullable FK to `users`,
  `onDelete: "set null"`, matching `files.uploadedByUserId`'s pattern),
  `isActive` (boolean, default true — "archive" is a soft-delete flag, not a
  row deletion, so a mistakenly-archived link can be restored), `createdAt`,
  `updatedAt`.
- `relatedEntityType`/`relatedEntityId` reuse the **same generic
  polymorphic-by-convention pattern** as `files`, and reuse the **same**
  `RELATED_ENTITY_FILE_RULES` map for authorization — an entity type that is
  already registered for uploaded Files (Property, Work Order, Property
  Equipment, Asset, Vendor, Compliance, Tenant, Lease, and — once POLISH-3
  ships — Property Component) is automatically a valid target for External
  Document Links too, with the same view/manage capability gating, so no
  second per-entity-type authorization map is introduced. A future entity
  type only needs to register once, for both document sources simultaneously.

## 6. UI/UX Expectations

- Wherever a "Documents" panel exists today (Property, Work Order, Equipment,
  Asset, Vendor, Compliance, Tenant, Lease), it lists **both** document
  sources together in one combined list, each row visually tagged with its
  source ("Uploaded" vs. "External Link"), sorted the same way (e.g. by
  created date) rather than two separate lists a user has to check
  independently.
- "Add Document" gains two explicit actions: "Upload File" (existing flow,
  unchanged) and "Link External Document" (new: name, URL, type, optional
  description).
- Clicking an External Document Link row opens the URL in a new browser tab;
  clicking an Uploaded File row continues to use the existing authenticated
  streaming route.
- An invalid URL (wrong scheme, malformed) is rejected at save time with the
  existing validation UX standard: one top-level banner, the URL field
  highlighted, no raw validation-library text (e.g. "Enter a valid https://
  link" rather than a raw Zod message).
- Archived (inactive) External Document Links are hidden from the default
  list view but remain reachable via an "include archived" toggle, matching
  the soft-delete/`isActive` convention already used throughout the app
  (e.g. property contacts, vendors).

## 7. Authorization/Capability Considerations

- **No new capability set is introduced.** Every External Document Link
  action (view/create/archive) reuses the **same** `viewCapability` /
  `manageCapability` pair already defined per entity type in
  `RELATED_ENTITY_FILE_RULES` — e.g. an External Document Link on a Property
  is gated by `PROPERTY_CAPABILITIES.VIEW` / `MANAGE_DOCUMENTS`, exactly like
  an uploaded Property file. This is a deliberate simplification: a user who
  can manage a Property's documents can manage both kinds without a separate
  permission to track.
- The External Document Links API route(s) must call
  `getRelatedEntityFileRules(relatedEntityType)` exactly as the existing
  `/api/files` routes do, rather than re-deriving capability requirements
  independently — this keeps the two document sources' authorization
  guaranteed-identical by construction, not by convention alone.

## 8. Notifications/Email Considerations

None required. Creating or archiving an External Document Link does not
trigger a notification in this phase (consistent with uploaded Files today,
which also do not notify on upload).

## 9. Audit Requirements

- Create/edit/archive of an External Document Link is recorded via the
  existing generic `audit_log` (`entityType: "external_document_link"`,
  `before`/`after` including `name`, `url`, `documentType`, `isActive`).
- URL changes specifically should always be visible in the audit before/after
  diff, since a changed URL on an existing record is the one mutation most
  worth being able to trace (e.g. "this used to point at document A, now
  points at document B").

## 10. Migration Considerations

Single additive migration: create `external_document_links`. No existing
table is altered. No backfill — there is no prior external-link concept to
migrate from.

## 11. Backward Compatibility

- The existing `files` table, its validation, its streaming route, and its
  capability-gating map are completely unchanged — External Document Links
  are a parallel, additive concept, not a replacement or reshaping of
  uploaded files.
- Every entity type that already attaches Files continues to work exactly as
  before; this phase only adds a second, optional attachment source to the
  same entities, gated by the same rules.
- Document how the two sources coexist: any UI or API contract that currently
  assumes "a document for entity X" means "a `files` row" must be updated to
  understand a document can now be either a `files` row or an
  `external_document_links` row — implementation must audit existing
  Documents-panel components for this assumption before wiring in the second
  source, rather than assuming every consumer already handles a union type.

## 12. Explicit Out-of-Scope Items

- Full SharePoint API synchronization of any kind.
- Microsoft Graph integration.
- Downloading, mirroring, or duplicating externally-linked files into Blob
  storage, automatically or via a manual "import" action.
- Verifying/monitoring that an external URL remains valid over time (no
  periodic link-health check, no broken-link notification).
- Hostname allowlisting beyond the `https:` scheme requirement.
- A visual document-embed/preview of external content inside PropertyOps.

## 13. Dependencies

None hard. This phase can proceed independently of POLISH-2/3, but is
sequenced after them per the roadmap so its "related entity" list can include
Property Component (from POLISH-3) without a later amendment. If implemented
before POLISH-3 ships, Property Component is simply not yet in the valid
related-entity-type list, and gets added the same way any future entity type
would — no rework required.

## 14. Acceptance Criteria

- An External Document Link can be created against any entity type already
  registered in `RELATED_ENTITY_FILE_RULES`, with name/URL/type/description,
  and is correctly gated by that entity's existing view/manage capabilities.
- A non-`https:` URL (e.g. `http://`, `javascript:`, `data:`) is rejected at
  save time with a clear, non-raw-error message.
- The combined Documents panel for a given entity shows both Uploaded Files
  and External Document Links together, clearly distinguished, in one list.
- Opening an External Document Link opens the external URL in a new tab
  without proxying through PropertyOps.
- Archiving an External Document Link removes it from the default list but
  it remains visible via "include archived," and can be restored.
- No code path downloads or copies the externally-linked file into Blob
  storage.

## 15. Manual Verification Checklist

1. On a Property, add an External Document Link with a valid `https://`
   SharePoint-style URL, a name, and a type; confirm it appears in the
   Documents panel alongside any existing uploaded files.
2. Attempt to save a link with `http://...`; confirm rejection with a clear
   inline message.
3. Attempt to save a link with `javascript:alert(1)`; confirm rejection.
4. Click the External Document Link; confirm it opens the URL in a new tab.
5. Archive the link; confirm it disappears from the default list and
   reappears when "include archived" is toggled on.
6. Confirm a user without that Property's `MANAGE_DOCUMENTS` capability
   cannot create or archive an External Document Link, but a user with only
   `VIEW` can see existing ones.
7. Repeat step 1 against at least one other registered entity type (e.g.
   Vendor or Lease) to confirm the generic `relatedEntityType` wiring works
   beyond Property.

## 16. Open Questions

- Final `documentType` vocabulary per entity (Section 5 proposes a small
  fixed list: `lease`, `insurance`, `contract`, `compliance`, `financial`,
  `other`) should be confirmed against real document categories the business
  actually files in SharePoint before implementation locks the enum, since
  it is user-facing taxonomy rather than an architectural decision.
