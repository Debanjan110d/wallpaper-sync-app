"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type AnalyticsEvent = "visit" | "download_click";

function sendEvent(event: AnalyticsEvent) {
  try {
    const payload = JSON.stringify({ event });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }

    // Fallback: keepalive fetch (best-effort).
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname === "/analytics") return;
    sendEvent("visit");
  }, [pathname]);

  return null;
}
