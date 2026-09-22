import { NOTIFICATION_TYPES } from "@/lib/notifications/types";

export interface PropertyNoteNotificationSubject {
  id: string;
  propertyId: string;
  propertyName: string;
  authorDisplayName: string;
  body: string;
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trimEnd()}…` : trimmed;
}

/** ACCESS-1: notifies Managers/Admins with access to the property — never the author. */
export function buildPropertyNoteCreatedNotification(note: PropertyNoteNotificationSubject) {
  return {
    type: NOTIFICATION_TYPES.PROPERTY_NOTE_CREATED,
    title: `New note on ${note.propertyName}`,
    body: `${note.authorDisplayName}: ${truncate(note.body, 120)}`,
    deepLinkUrl: `/properties/${note.propertyId}?tab=notes`,
    relatedEntityType: "property",
    relatedEntityId: note.propertyId,
    dedupeKey: `property_note_created:${note.id}`,
  };
}
