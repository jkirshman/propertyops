// PHOTO-1: pure rules for entity-owned photos. Every property_photos row
// belongs to a Property and at most one owning sub-entity; this module
// decides which one it is, who may upload/edit it, and how the aggregate
// Property Photos gallery labels and filters it. No DB access — callers pass
// already-loaded rows so all of it is unit-testable.

import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import {
  COMPONENT_TYPE_LABELS,
  PROPERTY_COMPONENT_CAPABILITIES,
  type ComponentType,
} from "@/lib/property-components/constants";
import {
  COMPONENT_PHOTO_CATEGORY,
  GENERAL_PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type PhotoCategory,
} from "@/lib/property-photos/constants";

export type PhotoSource = "property" | "unit" | "component" | "equipment";

export const PHOTO_SOURCE_LABELS: Record<PhotoSource, string> = {
  property: "Property",
  unit: "Unit / Suite",
  component: "Property Component",
  equipment: "Equipment",
};

export interface PhotoOwnerRefs {
  propertyUnitId: string | null;
  propertyComponentId: string | null;
  propertyEquipmentId: string | null;
}

/**
 * The owning context of a photo. Most-specific owner wins, which only
 * matters for legacy rows written before the single-owner CHECK existed
 * (e.g. a Manager-uploaded component photo that also carried a Unit tag) —
 * those read as a Component photo, never as two photos.
 */
export function resolvePhotoSource(refs: PhotoOwnerRefs): PhotoSource {
  if (refs.propertyEquipmentId) return "equipment";
  if (refs.propertyComponentId) return "component";
  if (refs.propertyUnitId) return "unit";
  return "property";
}

/** New/updated rows may reference at most one owning sub-entity. */
export function validatePhotoOwnerExclusivity(refs: Partial<PhotoOwnerRefs>): { ok: true } | { ok: false; error: "multiple_owners" } {
  const owners = [refs.propertyUnitId, refs.propertyComponentId, refs.propertyEquipmentId].filter(Boolean);
  return owners.length <= 1 ? { ok: true } : { ok: false, error: "multiple_owners" };
}

/**
 * Server-side check that a looked-up owning entity (Equipment, Component or
 * Unit) really belongs to the photo's Property and organization. `entity`
 * is null when the org-scoped lookup found nothing.
 */
export function validatePhotoOwnerBelongsToProperty(
  target: { organizationId: string; propertyId: string },
  entity: { organizationId: string; propertyId: string } | null,
): { ok: true } | { ok: false; error: "owner_not_found" | "owner_wrong_property" } {
  if (!entity || entity.organizationId !== target.organizationId) {
    return { ok: false, error: "owner_not_found" };
  }
  if (entity.propertyId !== target.propertyId) {
    return { ok: false, error: "owner_wrong_property" };
  }
  return { ok: true };
}

/** Capability needed to see a photo of this source (its file is gated the same way by /api/files/[id]). */
export function canViewPhotoSource(capabilityKeys: string[], source: PhotoSource): boolean {
  switch (source) {
    case "equipment":
      return capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW);
    case "component":
      return capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.VIEW);
    default:
      return capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW);
  }
}

/** Full photo management for this source: caption, category, Unit tag, cover. */
export function canManagePhotoSource(capabilityKeys: string[], source: PhotoSource): boolean {
  if (capabilityKeys.includes(PROPERTY_CAPABILITIES.MANAGE_DOCUMENTS)) return true;
  if (source === "component") return capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_DOCUMENTS);
  if (source === "equipment") return capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS);
  return false;
}

/**
 * Who may add a photo from an entity's own detail page. Upload-only
 * capabilities (ACCESS-1's component one, PHOTO-1's equipment one) are
 * enough; Property scope is checked separately by the route.
 */
export function canUploadEntityPhoto(capabilityKeys: string[], source: "component" | "equipment"): boolean {
  if (source === "component") {
    return (
      capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.MANAGE_DOCUMENTS) ||
      capabilityKeys.includes(PROPERTY_COMPONENT_CAPABILITIES.UPLOAD_PHOTO)
    );
  }
  return (
    capabilityKeys.includes(EQUIPMENT_CAPABILITIES.MANAGE_DOCUMENTS) ||
    capabilityKeys.includes(EQUIPMENT_CAPABILITIES.UPLOAD_PHOTO)
  );
}

export type PhotoEditPermission = "full" | "caption_only" | "none";

/**
 * Metadata edit rule:
 * - Manager/Admin (manage capability for the source) → full edit.
 * - The photo's own uploader, while still holding the upload capability for
 *   that source → caption only. Never someone else's photo, and never
 *   category/Unit/cover.
 * - Everyone else → none. There is no photo delete anywhere in the app.
 */
export function resolvePhotoEditPermission(input: {
  capabilityKeys: string[];
  userId: string;
  source: PhotoSource;
  uploadedByUserId: string | null;
}): PhotoEditPermission {
  if (canManagePhotoSource(input.capabilityKeys, input.source)) return "full";
  if (
    input.uploadedByUserId !== null &&
    input.uploadedByUserId === input.userId &&
    (input.source === "component" || input.source === "equipment") &&
    canUploadEntityPhoto(input.capabilityKeys, input.source)
  ) {
    return "caption_only";
  }
  return "none";
}

/** Only a general or Unit photo can become the Property's cover. */
export function canBeCoverPhoto(source: PhotoSource): boolean {
  return source === "property" || source === "unit";
}

export interface PhotoContextInput extends PhotoOwnerRefs {
  category: string;
  unitLabel: string | null;
  componentType: string | null;
  componentName: string | null;
  componentOtherTypeLabel: string | null;
  equipmentDisplayName: string | null;
}

export interface PhotoContext {
  source: PhotoSource;
  sourceLabel: string;
  /** e.g. "Carrier AC #2", "Roof — Northwest", "Suite 101"; null for a general photo. */
  entityLabel: string | null;
  /** Deep link to the owning entity where one exists. */
  href: string | null;
  categoryLabel: string;
}

function componentLabel(input: PhotoContextInput): string {
  const typeLabel =
    input.componentType === "other" && input.componentOtherTypeLabel
      ? input.componentOtherTypeLabel
      : input.componentType
        ? (COMPONENT_TYPE_LABELS[input.componentType as ComponentType] ?? input.componentType)
        : "Component";
  return input.componentName ? `${typeLabel} — ${input.componentName}` : typeLabel;
}

/** How the aggregate gallery describes where a photo came from. */
export function describePhotoContext(input: PhotoContextInput): PhotoContext {
  const source = resolvePhotoSource(input);
  const categoryLabel = PHOTO_CATEGORY_LABELS[input.category as PhotoCategory] ?? input.category;

  switch (source) {
    case "equipment":
      return {
        source,
        sourceLabel: PHOTO_SOURCE_LABELS.equipment,
        entityLabel: input.equipmentDisplayName ?? "Equipment",
        href: `/equipment/${input.propertyEquipmentId}`,
        categoryLabel,
      };
    case "component":
      return {
        source,
        sourceLabel: PHOTO_SOURCE_LABELS.component,
        entityLabel: componentLabel(input),
        href: `/property-components/${input.propertyComponentId}`,
        categoryLabel,
      };
    case "unit":
      return {
        source,
        sourceLabel: PHOTO_SOURCE_LABELS.unit,
        entityLabel: input.unitLabel ?? "Unit",
        // Units have no detail page (and the gallery is already on the
        // Property page), so a Unit photo is labeled but not linked.
        href: null,
        categoryLabel,
      };
    default:
      return {
        source,
        // A legacy "component"-category photo with no linked Component stays
        // a Property photo but keeps its category label so it isn't misread.
        sourceLabel: input.category === COMPONENT_PHOTO_CATEGORY ? categoryLabel : PHOTO_SOURCE_LABELS.property,
        entityLabel: null,
        href: null,
        categoryLabel,
      };
  }
}

export const PHOTO_GALLERY_FILTERS = [
  "all",
  "property",
  "exterior",
  "interior",
  "site",
  "unit",
  "component",
  "equipment",
] as const;
export type PhotoGalleryFilter = (typeof PHOTO_GALLERY_FILTERS)[number];

export const PHOTO_GALLERY_FILTER_LABELS: Record<PhotoGalleryFilter, string> = {
  all: "All",
  property: "Property",
  exterior: "Exterior",
  interior: "Interior",
  site: "Site",
  unit: "Units / Suites",
  component: "Property Components",
  equipment: "Equipment",
};

/**
 * "property" = every general Property photo; exterior/interior/site narrow
 * that further by category. Source filters match the owning entity, so a
 * Unit photo categorized "exterior" shows under Units, not Exterior.
 */
export function matchesPhotoGalleryFilter(
  photo: { source: PhotoSource; category: string },
  filter: PhotoGalleryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "exterior":
    case "interior":
    case "site":
      return photo.source === "property" && photo.category === filter;
    // Legacy/untethered rows: a "unit_suite" photo with no Unit set, or a
    // "component" photo with no Component linked, still belongs under its
    // category's filter.
    case "unit":
      return photo.source === "unit" || (photo.source === "property" && photo.category === "unit_suite");
    case "component":
      return photo.source === "component" || (photo.source === "property" && photo.category === COMPONENT_PHOTO_CATEGORY);
    default:
      return photo.source === filter;
  }
}

export interface PhotoRowForPresentation extends PhotoContextInput {
  id: string;
  propertyId: string;
  fileId: string;
  caption: string | null;
  isCover: boolean;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  createdAt: Date | string;
  fileName: string;
  mimeType: string;
}

export interface PresentedPhoto {
  id: string;
  propertyId: string;
  fileId: string;
  category: string;
  caption: string | null;
  isCover: boolean;
  createdAt: string;
  uploadedByName: string | null;
  fileName: string;
  mimeType: string;
  propertyUnitId: string | null;
  context: PhotoContext;
  canEditCaption: boolean;
  canSetCover: boolean;
}

/**
 * Shapes a photo row for the client, with permissions resolved server-side
 * so the UI never re-derives authorization.
 */
export function presentPhoto(
  row: PhotoRowForPresentation,
  viewer: { userId: string; capabilityKeys: string[] },
): PresentedPhoto {
  const context = describePhotoContext(row);
  const permission = resolvePhotoEditPermission({
    capabilityKeys: viewer.capabilityKeys,
    userId: viewer.userId,
    source: context.source,
    uploadedByUserId: row.uploadedByUserId,
  });
  return {
    id: row.id,
    propertyId: row.propertyId,
    fileId: row.fileId,
    category: row.category,
    caption: row.caption,
    isCover: row.isCover,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    uploadedByName: row.uploadedByName,
    fileName: row.fileName,
    mimeType: row.mimeType,
    propertyUnitId: row.propertyUnitId,
    context,
    canEditCaption: permission !== "none",
    canSetCover: permission === "full" && !row.isCover && canBeCoverPhoto(context.source),
  };
}

/**
 * Category rule for POST /api/properties/[id]/photos: a Component-linked
 * request must be category "component" (legacy ACCESS-1 path); anything
 * else must be a general Property category. "equipment" is never accepted
 * there — Equipment photos only come from the Equipment route.
 */
export function isAllowedGeneralPhotoRequest(input: { category: string; propertyComponentId?: string | null }): boolean {
  if (input.propertyComponentId) return input.category === COMPONENT_PHOTO_CATEGORY;
  return (GENERAL_PHOTO_CATEGORIES as readonly string[]).includes(input.category);
}
