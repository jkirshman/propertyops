export const PROPERTY_CAPABILITIES = {
  VIEW: "property.view",
  CREATE: "property.create",
  EDIT: "property.edit",
  MANAGE_CONTACTS: "property.manage_contacts",
  MANAGE_NOTES: "property.manage_notes",
  MANAGE_DOCUMENTS: "property.manage_documents",
  // ACCESS-1: narrower than MANAGE_CONTACTS — lets a User create a contact
  // (which they may then edit themselves) without granting edit/delete rights
  // over contacts they didn't create.
  CREATE_CONTACT: "property.create_contact",
} as const;

export const PROPERTY_TYPE_CAPABILITIES = {
  VIEW: "property_type.view",
  MANAGE: "property_type.manage",
} as const;

export const OCCUPANCY_MODELS = ["owned", "leased", "managed", "other"] as const;
export type OccupancyModel = (typeof OCCUPANCY_MODELS)[number];

export const OCCUPANCY_MODEL_LABELS: Record<OccupancyModel, string> = {
  owned: "Owned",
  leased: "Leased",
  managed: "Managed",
  other: "Other",
};

export const CONTACT_TYPES = [
  "tenant",
  "owner",
  "landlord",
  "property_manager",
  "asset_manager",
  "emergency",
  "utility",
  "other",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  tenant: "Tenant",
  owner: "Owner",
  landlord: "Landlord",
  property_manager: "Property Manager",
  asset_manager: "Asset Manager",
  emergency: "Emergency Contact",
  utility: "Utility Contact",
  other: "Other",
};

export const PROPERTY_FILES_ENTITY_TYPE = "property";

// ACCESS-1: contact types a User (holding only CREATE_CONTACT, not
// MANAGE_CONTACTS) may assign when creating a Property Contact. Excludes
// authoritative ownership roles (owner, landlord, property_manager,
// asset_manager) and the lease-relationship "tenant" type — those stay
// Admin/Manager-only via MANAGE_CONTACTS.
export const USER_CREATABLE_CONTACT_TYPES: ContactType[] = ["emergency", "utility", "other"];
