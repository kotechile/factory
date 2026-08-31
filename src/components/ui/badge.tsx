import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent" | "outline" | "success" | "warning" | "destructive" | "muted";
}

const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary text-card border-transparent",
  accent: "bg-accent text-card border-transparent",
  outline: "border-border text-foreground bg-transparent",
  success: "bg-success text-card border-transparent",
  warning: "bg-warning text-card border-transparent",
  destructive: "bg-destructive text-card border-transparent",
  muted: "bg-muted text-card border-transparent",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
