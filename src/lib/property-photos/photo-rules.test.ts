import { describe, expect, it } from "vitest";

import { canViewPropertyPhoto } from "@/lib/property-photos/property-photos";
import type { PropertyScope } from "@/lib/auth/property-access";

import {
  canBeCoverPhoto,
  canUploadEntityPhoto,
  canViewPhotoSource,
  describePhotoContext,
  isAllowedGeneralPhotoRequest,
  matchesPhotoGalleryFilter,
  presentPhoto,
  resolvePhotoEditPermission,
  resolvePhotoSource,
  validatePhotoOwnerBelongsToProperty,
  validatePhotoOwnerExclusivity,
  type PhotoRowForPresentation,
} from "./photo-rules";

// Representative subsets of scripts/seed.ts's role capability lists.
const ADMIN = [
  "platform.admin",
  "property.view",
  "property.manage_documents",
  "equipment.view",
  "equipment.manage_documents",
  "equipment.upload_photo",
  "property_component.view",
  "property_component.manage_documents",
  "property_component.upload_photo",
];
const MANAGER = ADMIN.filter((key) => key !== "platform.admin");
const USER = [
  "property.view",
  "equipment.view",
  "equipment.upload_photo",
  "property_component.view",
  "property_component.upload_photo",
];

const NO_OWNER = { propertyUnitId: null, propertyComponentId: null, propertyEquipmentId: null };

const ORG = "org-1";
const PROPERTY = "prop-1";

function row(overrides: Partial<PhotoRowForPresentation> = {}): PhotoRowForPresentation {
  return {
    id: "photo-1",
    propertyId: PROPERTY,
    fileId: "file-1",
    category: "exterior",
    caption: null,
    isCover: false,
    uploadedByUserId: "manager-1",
    uploadedByName: "Pat Manager",
    createdAt: new Date("2026-09-01T12:00:00Z"),
    fileName: "front.jpg",
    mimeType: "image/jpeg",
    unitLabel: null,
    componentType: null,
    componentName: null,
    componentOtherTypeLabel: null,
    equipmentDisplayName: null,
    ...NO_OWNER,
    ...overrides,
  };
}

describe("resolvePhotoSource", () => {
  it("treats a photo with no owner FK as a general Property photo", () => {
    expect(resolvePhotoSource(NO_OWNER)).toBe("property");
  });

  it("recognises each single owner", () => {
    expect(resolvePhotoSource({ ...NO_OWNER, propertyUnitId: "u" })).toBe("unit");
    expect(resolvePhotoSource({ ...NO_OWNER, propertyComponentId: "c" })).toBe("component");
    expect(resolvePhotoSource({ ...NO_OWNER, propertyEquipmentId: "e" })).toBe("equipment");
  });

  it("reads a legacy row carrying both a Unit and a Component as a Component photo", () => {
    expect(resolvePhotoSource({ ...NO_OWNER, propertyUnitId: "u", propertyComponentId: "c" })).toBe("component");
  });
});

describe("validatePhotoOwnerExclusivity", () => {
  it("allows zero or one owner", () => {
    expect(validatePhotoOwnerExclusivity({}).ok).toBe(true);
    expect(validatePhotoOwnerExclusivity({ propertyUnitId: "u" }).ok).toBe(true);
    expect(validatePhotoOwnerExclusivity({ propertyEquipmentId: "e" }).ok).toBe(true);
  });

  it("rejects any combination of two or more owners", () => {
    expect(validatePhotoOwnerExclusivity({ propertyUnitId: "u", propertyComponentId: "c" })).toEqual({
      ok: false,
      error: "multiple_owners",
    });
    expect(validatePhotoOwnerExclusivity({ propertyComponentId: "c", propertyEquipmentId: "e" }).ok).toBe(false);
    expect(
      validatePhotoOwnerExclusivity({ propertyUnitId: "u", propertyComponentId: "c", propertyEquipmentId: "e" }).ok,
    ).toBe(false);
  });
});

describe("validatePhotoOwnerBelongsToProperty", () => {
  const target = { organizationId: ORG, propertyId: PROPERTY };

  it("accepts Equipment / a Component / a Unit on the same Property and org", () => {
    expect(validatePhotoOwnerBelongsToProperty(target, { organizationId: ORG, propertyId: PROPERTY })).toEqual({ ok: true });
  });

  it("rejects an owner on a different Property of the same org", () => {
    expect(validatePhotoOwnerBelongsToProperty(target, { organizationId: ORG, propertyId: "prop-2" })).toEqual({
      ok: false,
      error: "owner_wrong_property",
    });
  });

  it("rejects an owner from another organization, even with a matching property id", () => {
    expect(validatePhotoOwnerBelongsToProperty(target, { organizationId: "org-2", propertyId: PROPERTY })).toEqual({
      ok: false,
      error: "owner_not_found",
    });
  });

  it("rejects an owner the org-scoped lookup didn't find", () => {
    expect(validatePhotoOwnerBelongsToProperty(target, null)).toEqual({ ok: false, error: "owner_not_found" });
  });
});

describe("isAllowedGeneralPhotoRequest (Property Photos tab uploads)", () => {
  it("accepts the general Property categories", () => {
    for (const category of ["exterior", "interior", "site", "unit_suite", "other"]) {
      expect(isAllowedGeneralPhotoRequest({ category })).toBe(true);
    }
  });

  it("no longer accepts 'component' or 'equipment' as a manual category", () => {
    expect(isAllowedGeneralPhotoRequest({ category: "component" })).toBe(false);
    expect(isAllowedGeneralPhotoRequest({ category: "equipment" })).toBe(false);
  });

  it("keeps the legacy ACCESS-1 Component-linked request working, only as category 'component'", () => {
    expect(isAllowedGeneralPhotoRequest({ category: "component", propertyComponentId: "c" })).toBe(true);
    expect(isAllowedGeneralPhotoRequest({ category: "exterior", propertyComponentId: "c" })).toBe(false);
  });
});

describe("canUploadEntityPhoto", () => {
  it("lets Admin, Manager and a scoped User upload Equipment and Component photos", () => {
    for (const keys of [ADMIN, MANAGER, USER]) {
      expect(canUploadEntityPhoto(keys, "equipment")).toBe(true);
      expect(canUploadEntityPhoto(keys, "component")).toBe(true);
    }
  });

  it("denies a role with neither the manage nor the upload capability", () => {
    expect(canUploadEntityPhoto(["property.view", "equipment.view"], "equipment")).toBe(false);
    expect(canUploadEntityPhoto(["property.view", "property_component.view"], "component")).toBe(false);
  });

  it("does not let the component capability stand in for the equipment one, or vice versa", () => {
    expect(canUploadEntityPhoto(["property_component.upload_photo"], "equipment")).toBe(false);
    expect(canUploadEntityPhoto(["equipment.upload_photo"], "component")).toBe(false);
  });
});

describe("resolvePhotoEditPermission", () => {
  it("gives Admin and Manager full edit on every source", () => {
    for (const keys of [ADMIN, MANAGER]) {
      for (const source of ["property", "unit", "component", "equipment"] as const) {
        expect(resolvePhotoEditPermission({ capabilityKeys: keys, userId: "x", source, uploadedByUserId: "y" })).toBe("full");
      }
    }
  });

  it("lets a User edit only the caption of their own Equipment/Component photo", () => {
    expect(
      resolvePhotoEditPermission({ capabilityKeys: USER, userId: "user-1", source: "equipment", uploadedByUserId: "user-1" }),
    ).toBe("caption_only");
    expect(
      resolvePhotoEditPermission({ capabilityKeys: USER, userId: "user-1", source: "component", uploadedByUserId: "user-1" }),
    ).toBe("caption_only");
  });

  it("never lets a User edit a Manager/Admin's (or anyone else's) photo", () => {
    expect(
      resolvePhotoEditPermission({ capabilityKeys: USER, userId: "user-1", source: "equipment", uploadedByUserId: "manager-1" }),
    ).toBe("none");
  });

  it("treats a photo whose uploader was deleted (null) as not owned by anyone", () => {
    expect(
      resolvePhotoEditPermission({ capabilityKeys: USER, userId: "user-1", source: "component", uploadedByUserId: null }),
    ).toBe("none");
  });

  it("gives a User no edit on general or Unit photos — the Property Photos tab stays view-only", () => {
    for (const source of ["property", "unit"] as const) {
      expect(
        resolvePhotoEditPermission({ capabilityKeys: USER, userId: "user-1", source, uploadedByUserId: "user-1" }),
      ).toBe("none");
    }
  });

  it("drops ownership rights once the upload capability is removed", () => {
    expect(
      resolvePhotoEditPermission({ capabilityKeys: ["equipment.view"], userId: "u", source: "equipment", uploadedByUserId: "u" }),
    ).toBe("none");
  });
});

describe("canBeCoverPhoto", () => {
  it("allows only general and Unit photos as the Property cover", () => {
    expect(canBeCoverPhoto("property")).toBe(true);
    expect(canBeCoverPhoto("unit")).toBe(true);
    expect(canBeCoverPhoto("component")).toBe(false);
    expect(canBeCoverPhoto("equipment")).toBe(false);
  });
});

describe("canViewPhotoSource", () => {
  it("requires the owning entity's view capability", () => {
    expect(canViewPhotoSource(["property.view"], "equipment")).toBe(false);
    expect(canViewPhotoSource(["property.view", "equipment.view"], "equipment")).toBe(true);
    expect(canViewPhotoSource(["property.view"], "component")).toBe(false);
    expect(canViewPhotoSource(["property.view"], "property")).toBe(true);
  });
});

describe("ACCESS-1 scope for aggregate photos", () => {
  const unitRestricted: PropertyScope = { kind: "scoped", access: [{ propertyId: PROPERTY, propertyUnitId: "unit-a" }] };
  const otherProperty: PropertyScope = { kind: "scoped", access: [{ propertyId: "prop-2", propertyUnitId: null }] };

  it("shows Property-wide Equipment/Component photos to a Unit-restricted user of the Property", () => {
    expect(canViewPropertyPhoto(unitRestricted, PROPERTY, null)).toBe(true);
  });

  it("hides another Unit's photo from a Unit-restricted user", () => {
    expect(canViewPropertyPhoto(unitRestricted, PROPERTY, "unit-b")).toBe(false);
  });

  it("hides every photo of a Property the user has no access to", () => {
    expect(canViewPropertyPhoto(otherProperty, PROPERTY, null)).toBe(false);
  });
});

describe("describePhotoContext (aggregate gallery labels)", () => {
  it("labels and links an Equipment photo", () => {
    expect(
      describePhotoContext(row({ category: "equipment", propertyEquipmentId: "eq-2", equipmentDisplayName: "Carrier AC #2" })),
    ).toEqual({
      source: "equipment",
      sourceLabel: "Equipment",
      entityLabel: "Carrier AC #2",
      href: "/equipment/eq-2",
      categoryLabel: "Equipment",
    });
  });

  it("labels and links a Component photo with its type and name", () => {
    const context = describePhotoContext(
      row({ category: "component", propertyComponentId: "c-1", componentType: "roof", componentName: "Northwest section" }),
    );
    expect(context.sourceLabel).toBe("Property Component");
    expect(context.entityLabel).toBe("Roof — Northwest section");
    expect(context.href).toBe("/property-components/c-1");
  });

  it("uses a custom label for an 'other' Component type", () => {
    expect(
      describePhotoContext(
        row({ category: "component", propertyComponentId: "c-1", componentType: "other", componentOtherTypeLabel: "Bike Rack" }),
      ).entityLabel,
    ).toBe("Bike Rack");
  });

  it("labels a Unit photo with its Unit label (no detail page to link to)", () => {
    const context = describePhotoContext(row({ category: "unit_suite", propertyUnitId: "u-1", unitLabel: "Suite 101" }));
    expect(context).toMatchObject({ source: "unit", sourceLabel: "Unit / Suite", entityLabel: "Suite 101", href: null });
  });

  it("labels a general photo as Property with its category", () => {
    expect(describePhotoContext(row({ category: "site" }))).toMatchObject({
      source: "property",
      sourceLabel: "Property",
      entityLabel: null,
      categoryLabel: "Site",
    });
  });

  it("keeps a legacy linked Component photo associated with its Component", () => {
    const context = describePhotoContext(
      row({ category: "component", propertyComponentId: "c-legacy", propertyUnitId: "u-1", componentType: "parking_lot" }),
    );
    expect(context).toMatchObject({ source: "component", entityLabel: "Parking Lot", href: "/property-components/c-legacy" });
  });

  it("keeps a legacy unlinked 'component'-category photo visibly labeled as such", () => {
    expect(describePhotoContext(row({ category: "component" }))).toMatchObject({
      source: "property",
      sourceLabel: "Property Component",
      href: null,
    });
  });
});

describe("matchesPhotoGalleryFilter", () => {
  const general = { source: "property" as const, category: "exterior" };
  const unitTaggedExterior = { source: "unit" as const, category: "exterior" };
  const equipment = { source: "equipment" as const, category: "equipment" };
  const legacyUnlinkedComponent = { source: "property" as const, category: "component" };

  it("'all' matches everything", () => {
    for (const photo of [general, unitTaggedExterior, equipment]) {
      expect(matchesPhotoGalleryFilter(photo, "all")).toBe(true);
    }
  });

  it("source filters match the owning entity, not the category", () => {
    expect(matchesPhotoGalleryFilter(unitTaggedExterior, "unit")).toBe(true);
    expect(matchesPhotoGalleryFilter(unitTaggedExterior, "exterior")).toBe(false);
    expect(matchesPhotoGalleryFilter(equipment, "equipment")).toBe(true);
    expect(matchesPhotoGalleryFilter(equipment, "property")).toBe(false);
  });

  it("category filters narrow general Property photos", () => {
    expect(matchesPhotoGalleryFilter(general, "exterior")).toBe(true);
    expect(matchesPhotoGalleryFilter(general, "interior")).toBe(false);
    expect(matchesPhotoGalleryFilter(general, "property")).toBe(true);
  });

  it("keeps legacy untethered rows findable under their category's filter", () => {
    expect(matchesPhotoGalleryFilter(legacyUnlinkedComponent, "component")).toBe(true);
    expect(matchesPhotoGalleryFilter({ source: "property", category: "unit_suite" }, "unit")).toBe(true);
  });
});

describe("presentPhoto", () => {
  it("serializes the row and resolves per-viewer actions server-side", () => {
    const presented = presentPhoto(row(), { userId: "manager-1", capabilityKeys: MANAGER });
    expect(presented).toMatchObject({
      id: "photo-1",
      propertyId: PROPERTY,
      createdAt: "2026-09-01T12:00:00.000Z",
      uploadedByName: "Pat Manager",
      canEditCaption: true,
      canSetCover: true,
    });
  });

  it("never offers 'Set as cover' on an Equipment photo or the current cover", () => {
    const equipmentPhoto = row({ category: "equipment", propertyEquipmentId: "eq-1" });
    expect(presentPhoto(equipmentPhoto, { userId: "m", capabilityKeys: MANAGER }).canSetCover).toBe(false);
    expect(presentPhoto(row({ isCover: true }), { userId: "m", capabilityKeys: MANAGER }).canSetCover).toBe(false);
  });

  it("gives a User caption edit on their own Equipment photo but nothing on a Manager's", () => {
    const own = row({ category: "equipment", propertyEquipmentId: "eq-1", uploadedByUserId: "user-1" });
    const managers = row({ category: "equipment", propertyEquipmentId: "eq-1", uploadedByUserId: "manager-1" });
    expect(presentPhoto(own, { userId: "user-1", capabilityKeys: USER })).toMatchObject({ canEditCaption: true, canSetCover: false });
    expect(presentPhoto(managers, { userId: "user-1", capabilityKeys: USER })).toMatchObject({ canEditCaption: false, canSetCover: false });
  });
});
