"use client";

import { useRouter } from "next/navigation";

import { ManualEventForm } from "@/components/calendar/ManualEventForm";

interface OptionRecord {
  id: string;
  name: string;
}

export function ManualEventEditPanel({
  event,
  properties,
  timezone,
  canEdit,
}: {
  event: {
    id: string;
    title: string;
    propertyId: string | null;
    description: string | null;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    status: string;
  };
  properties: OptionRecord[];
  timezone: string;
  canEdit: boolean;
}) {
  const router = useRouter();

  return (
    <ManualEventForm
      properties={properties}
      timezone={timezone}
      canEdit={canEdit}
      initial={{
        id: event.id,
        title: event.title,
        propertyId: event.propertyId,
        description: event.description,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt ? event.endAt.toISOString() : null,
        allDay: event.allDay,
        status: event.status,
      }}
      onSaved={() => router.refresh()}
    />
  );
}
