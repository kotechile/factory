import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent" | "outline" | "success" | "warning" | "destructive" | "muted";
}

// Soft, desaturated badges (10% tint background + colored text + 20% tint border),
// per the 60/30/10 style guide. Only "default" (indigo) is a solid accent pill.
const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary text-card border-transparent",
  accent: "bg-primary/10 text-primary border-primary/20",
  outline: "border-border text-foreground bg-transparent",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted/10 text-muted border-transparent",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
