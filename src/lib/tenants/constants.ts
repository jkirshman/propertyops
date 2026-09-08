export const TENANT_CAPABILITIES = {
  VIEW: "tenant.view",
  CREATE: "tenant.create",
  EDIT: "tenant.edit",
  MANAGE_CONTACTS: "tenant.manage_contacts",
  MANAGE_DOCUMENTS: "tenant.manage_documents",
} as const;

export const TENANT_TYPES = ["individual", "business"] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  individual: "Individual",
  business: "Business / Organization",
};

export const TENANT_FILES_ENTITY_TYPE = "tenant";
