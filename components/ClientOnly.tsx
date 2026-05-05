"use client";

import { useEffect, useState } from "react";

export default function ClientOnly({
  fallback,
  children,
}: {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback ?? null}</>;
  return <>{children}</>;
}
