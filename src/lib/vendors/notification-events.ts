import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface VendorNotificationSubject {
  id: string;
  name: string;
}

function deepLink(vendorId: string) {
  return `/vendors?pending=${vendorId}`;
}

export function buildVendorSubmittedNotification(vendor: VendorNotificationSubject, submitterName: string) {
  return {
    type: NOTIFICATION_TYPES.VENDOR_SUBMITTED,
    title: `Vendor submitted for approval: ${vendor.name}`,
    body: `Submitted by ${submitterName}.`,
    deepLinkUrl: deepLink(vendor.id),
    relatedEntityType: "vendor",
    relatedEntityId: vendor.id,
    dedupeKey: `vendor_submitted:${vendor.id}`,
  };
}

export function buildVendorApprovedNotification(vendor: VendorNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.VENDOR_APPROVED,
    title: `Vendor approved: ${vendor.name}`,
    deepLinkUrl: `/vendors/${vendor.id}`,
    relatedEntityType: "vendor",
    relatedEntityId: vendor.id,
    dedupeKey: `vendor_approved:${vendor.id}`,
  };
}

export function buildVendorRejectedNotification(vendor: VendorNotificationSubject, reviewNotes?: string | null) {
  return {
    type: NOTIFICATION_TYPES.VENDOR_REJECTED,
    title: `Vendor request declined: ${vendor.name}`,
    body: reviewNotes ?? undefined,
    relatedEntityType: "vendor",
    relatedEntityId: vendor.id,
    dedupeKey: `vendor_rejected:${vendor.id}`,
  };
}
