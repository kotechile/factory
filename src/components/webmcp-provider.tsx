"use client";

import * as React from "react";
import { registerDefaultWebMCPTools } from "@/lib/webmcp";

export interface WebMCPProviderProps {
  children: React.ReactNode;
}

/**
 * Client component that registers WebMCP tools on client mount.
 */
export function WebMCPProvider({ children }: WebMCPProviderProps) {
  React.useEffect(() => {
    registerDefaultWebMCPTools();
  }, []);

  return <>{children}</>;
}
