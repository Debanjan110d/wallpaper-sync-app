"use client";

import React, { useCallback } from "react";

type AnalyticsEvent = "download_click";

function track(event: AnalyticsEvent) {
  try {
    const payload = JSON.stringify({ event });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }

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

type Props = React.ComponentPropsWithoutRef<"a"> & {
  analyticsEvent?: AnalyticsEvent;
};

export default function TrackLink({ analyticsEvent, onClick, onAuxClick, ...props }: Props) {
  const handle = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (analyticsEvent) track(analyticsEvent);
    },
    [analyticsEvent, onClick]
  );

  const handleAux = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onAuxClick?.(e);
      if (e.defaultPrevented) return;
      if (analyticsEvent) track(analyticsEvent);
    },
    [analyticsEvent, onAuxClick]
  );

  return <a {...props} onClick={handle} onAuxClick={handleAux} />;
}
