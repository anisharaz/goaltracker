"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Strips the ?highlight= param a short while after mount, once the
 * new-item glow animation has had time to play. Keeps the highlight
 * from lingering across refreshes/back-navigation.
 */
export function ClearHighlightParam() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("highlight");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return null;
}
