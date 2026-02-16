"use client";

import { useState } from "react";
import { CreateLinkCard } from "@/app/components/dashboard/CreateLinkCard";
import { KpiCards } from "@/app/components/dashboard/KpiCards";
import { LinksTableCard } from "@/app/components/dashboard/LinksTableCard";
import type { DashboardKpis, DashboardLinkItem } from "@/lib/dashboard-types";

type DashboardClientProps = {
  initialKpis: DashboardKpis;
  initialLinks: DashboardLinkItem[];
};

export function DashboardClient({ initialKpis, initialLinks }: DashboardClientProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [links, setLinks] = useState(initialLinks);
  const [copiedCode, setCopiedCode] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  function prependLink(link: DashboardLinkItem) {
    setLinks((prev) => [link, ...prev]);
    setKpis((prev) => ({ ...prev, totalLinks: prev.totalLinks + 1 }));
  }

  async function handleCreate(payload: { id: string; code: string; targetUrl: string }) {
    const created: DashboardLinkItem = {
      id: payload.id,
      code: payload.code,
      targetUrl: payload.targetUrl,
      createdAt: new Date().toISOString(),
      clickCount: 0,
    };
    prependLink(created);
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    try {
      const response = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!response.ok) return;
      setLinks((prev) => prev.filter((item) => item.id !== id));
      setKpis((prev) => ({ ...prev, totalLinks: Math.max(0, prev.totalLinks - 1) }));
    } finally {
      setPendingDeleteId("");
    }
  }

  async function handleCopy(code: string) {
    const link = `${window.location.origin}/${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  }

  return (
    <>
      <KpiCards kpis={kpis} />
      <CreateLinkCard onCreated={handleCreate} />
      <LinksTableCard
        links={links}
        pendingDeleteId={pendingDeleteId}
        copiedCode={copiedCode}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
    </>
  );
}
