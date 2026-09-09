import Link from "next/link";

import { COMPLIANCE_STATUS_LABELS } from "@/lib/compliance/status";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@/lib/work-orders/constants";
import type { AppBrief as AppBriefData } from "@/lib/home/app-brief";

function BriefSection({
  title,
  viewAllHref,
  totalCount,
  itemCount,
  emptyMessage,
  children,
}: {
  title: string;
  viewAllHref: string;
  totalCount: number;
  itemCount: number;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>{title}</h2>
        {totalCount > itemCount ? (
          <Link href={viewAllHref} className="muted" style={{ fontSize: "0.85rem" }}>
            View all {totalCount}
          </Link>
        ) : null}
      </div>
      {totalCount === 0 ? (
        <p className="muted" style={{ fontSize: "0.9rem" }}>{emptyMessage}</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>{children}</ul>
      )}
    </div>
  );
}

function BriefRow({ primary, secondary, href }: { primary: React.ReactNode; secondary: React.ReactNode; href: string }) {
  return (
    <li style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.9rem" }}>
      <Link href={href}>{primary}</Link>
      <span className="muted">{secondary}</span>
    </li>
  );
}

export function AppBrief({ brief }: { brief: AppBriefData }) {
  const sections: React.ReactNode[] = [];

  if (brief.overdueWorkOrders) {
    const { items, totalCount } = brief.overdueWorkOrders;
    sections.push(
      <BriefSection
        key="overdue-work-orders"
        title="Overdue Work Orders"
        viewAllHref="/work-orders"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No overdue work orders."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/work-orders/${item.id}`}
            primary={`${item.number} · ${item.subject}`}
            secondary={`${item.propertyName} · ${WORK_ORDER_STATUS_LABELS[item.status as WorkOrderStatus] ?? item.status}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.urgentWorkOrders) {
    const { items, totalCount } = brief.urgentWorkOrders;
    sections.push(
      <BriefSection
        key="urgent-work-orders"
        title="High / Urgent Work Orders"
        viewAllHref="/work-orders"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No high or urgent work orders open."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/work-orders/${item.id}`}
            primary={`${item.number} · ${item.subject}`}
            secondary={`${item.propertyName} · ${item.priority === "urgent" ? "Urgent" : "High"}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.duePmPlans) {
    const { items, totalCount } = brief.duePmPlans;
    sections.push(
      <BriefSection
        key="pm-due"
        title="Preventive Maintenance Due"
        viewAllHref="/preventive-maintenance"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No preventive maintenance due."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/preventive-maintenance/${item.id}`}
            primary={item.name}
            secondary={`${item.propertyName} · Due ${item.nextDueAt}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.dueInspections) {
    const { items, totalCount } = brief.dueInspections;
    sections.push(
      <BriefSection
        key="inspections-due"
        title="Inspections Due"
        viewAllHref="/inspections"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No inspections due soon."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/inspections/${item.id}`}
            primary={item.templateName}
            secondary={`${item.propertyName}${item.scheduledDate ? ` · ${item.scheduledDate}` : ""}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.expiringCompliance) {
    const { items, totalCount } = brief.expiringCompliance;
    sections.push(
      <BriefSection
        key="compliance"
        title="Compliance Expiring / Expired"
        viewAllHref="/properties"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No compliance records expiring soon."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/properties/${item.propertyId}?tab=compliance`}
            primary={item.name}
            secondary={`${item.propertyName} · ${COMPLIANCE_STATUS_LABELS[item.status]}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.leaseMilestones) {
    const { items, totalCount } = brief.leaseMilestones;
    sections.push(
      <BriefSection
        key="lease-milestones"
        title="Lease Milestones Approaching"
        viewAllHref="/leases"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No lease milestones approaching."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/leases/${item.id}`}
            primary={item.label}
            secondary={item.propertyName}
          />
        ))}
      </BriefSection>,
    );
  }

  if (brief.attentionEquipment) {
    const { items, totalCount } = brief.attentionEquipment;
    sections.push(
      <BriefSection
        key="equipment"
        title="Equipment Needing Attention"
        viewAllHref="/properties"
        totalCount={totalCount}
        itemCount={items.length}
        emptyMessage="No equipment in poor condition or out of service."
      >
        {items.map((item) => (
          <BriefRow
            key={item.id}
            href={`/properties/${item.propertyId}?tab=equipment`}
            primary={item.displayName}
            secondary={`${item.propertyName} · ${item.status === "out_of_service" ? "Out of Service" : "Poor condition"}`}
          />
        ))}
      </BriefSection>,
    );
  }

  if (sections.length === 0) {
    if (brief.hasCapabilityForAnySection) {
      return (
        <p className="muted">
          Your App Brief is clear. You can choose what appears here from{" "}
          <Link href="/profile">Profile</Link>.
        </p>
      );
    }
    return <p className="muted">Nothing to show here yet — your role has no App Brief sections to display.</p>;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{sections}</div>;
}
