import { PROPERTY_TYPE_CAPABILITIES } from "@/lib/properties/constants";

export const ADMIN_CAPABILITIES = {
  USERS: "users.manage",
  ROLES: "roles.manage",
  SYSTEM: "system.manage",
  NOTIFICATIONS: "notifications.manage",
  EMAIL: "email.manage",
  FILES: "files.manage",
} as const;

export interface AdminTile {
  id: string;
  title: string;
  description: string;
  href: string;
  group: string;
  requiredCapability: string;
}

export const ADMIN_TILE_GROUPS = [
  { id: "properties", title: "Properties" },
  { id: "access", title: "Access" },
  { id: "communications", title: "Communications" },
  { id: "platform", title: "Platform" },
];

export const ADMIN_TILES: AdminTile[] = [
  {
    id: "property-types",
    title: "Property Types",
    description: "Manage the property type taxonomy used across PropertyOps.",
    href: "/admin/property-types",
    group: "properties",
    requiredCapability: PROPERTY_TYPE_CAPABILITIES.MANAGE,
  },
  {
    id: "users",
    title: "Users & Access",
    description: "Manage platform users and their access.",
    href: "/admin/users",
    group: "access",
    requiredCapability: ADMIN_CAPABILITIES.USERS,
  },
  {
    id: "roles",
    title: "Roles & Capabilities",
    description: "Manage roles and the capabilities granted to them.",
    href: "/admin/roles",
    group: "access",
    requiredCapability: ADMIN_CAPABILITIES.ROLES,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Notification delivery and preferences.",
    href: "/admin/notifications",
    group: "communications",
    requiredCapability: ADMIN_CAPABILITIES.NOTIFICATIONS,
  },
  {
    id: "email",
    title: "Email",
    description: "Transactional email configuration and health.",
    href: "/admin/email",
    group: "communications",
    requiredCapability: ADMIN_CAPABILITIES.EMAIL,
  },
  {
    id: "files",
    title: "Files / Documents",
    description: "Private file storage shared by future modules.",
    href: "/admin/files",
    group: "platform",
    requiredCapability: ADMIN_CAPABILITIES.FILES,
  },
  {
    id: "system",
    title: "System / Platform",
    description: "Platform-level configuration and health.",
    href: "/admin/system",
    group: "platform",
    requiredCapability: ADMIN_CAPABILITIES.SYSTEM,
  },
];

export function visibleAdminTiles(capabilityKeys: string[]): AdminTile[] {
  return ADMIN_TILES.filter((tile) => capabilityKeys.includes(tile.requiredCapability));
}

export function hasAnyAdminCapability(capabilityKeys: string[]): boolean {
  return ADMIN_TILES.some((tile) => capabilityKeys.includes(tile.requiredCapability));
}
