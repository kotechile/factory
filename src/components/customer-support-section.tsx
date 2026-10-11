"use client";

import * as React from "react";
import {
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppleSegmentedTabs } from "@/components/editorial/apple-segmented-tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface SupportTicket {
  ticket_id: string;
  name: string;
  email: string;
  category: "complaint" | "comment" | "billing" | "bug" | "general";
  product: string;
  subject: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "dismissed";
  created_at: string;
}

/**
 * Customer service on the billing portal: file a ticket, then read it back by quoting the
 * `ticket_id` together with the email it was filed with. The read path is deliberately
 * self-scoped — `/api/support` will not list other customers' tickets to a visitor; the
 * internal listing requires the deployment's support admin token.
 */
export default function CustomerSupportSection() {
  const [activeTab, setActiveTab] = React.useState<"submit" | "track">("submit");

  // Form state
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [category, setCategory] = React.useState<string>("complaint");
  const [product, setProduct] = React.useState<string>("general");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = React.useState<string | null>(null);

  // Tracking state — self-scoped lookup: ticket id + the email it was filed with.
  const [lookupTicketId, setLookupTicketId] = React.useState("");
  const [lookupEmail, setLookupEmail] = React.useState("");
  const [loadingTickets, setLoadingTickets] = React.useState(false);
  const [trackError, setTrackError] = React.useState<string | null>(null);
  const [tracked, setTracked] = React.useState<SupportTicket | null>(null);
  const [searched, setSearched] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!email.trim() || !email.includes("@")) {
      setSubmitError("Please enter a valid email address.");
      return;
    }
    if (!subject.trim()) {
      setSubmitError("Please enter a subject.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setSubmitError("Please provide at least 5 characters in your message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          product,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit support request.");
      }

      setSubmittedTicket(data.ticket_id);
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit support request.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadTicket = async (ticketId: string, lookupMail: string) => {
    setTrackError(null);
    setSearched(false);

    if (!ticketId.trim() || !lookupMail.trim()) {
      setTrackError("Enter both your ticket reference (TKT-…) and the email you filed it with.");
      return;
    }

    setLoadingTickets(true);
    try {
      const params = new URLSearchParams({
        ticket_id: ticketId.trim(),
        email: lookupMail.trim(),
      });

      const res = await fetch(`/api/support?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch the ticket.");

      const tickets: SupportTicket[] = data.tickets || [];
      setTracked(tickets[0] || null);
      setSearched(true);
    } catch (err: unknown) {
      setTracked(null);
      setTrackError(err instanceof Error ? err.message : "Failed to fetch the ticket.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const statusBadge = (status: SupportTicket["status"]) => {
    if (status === "new") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-mono font-bold">
          <Clock className="h-3 w-3" />
          NEW
        </span>
      );
    }
    if (status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono font-bold">
          <RefreshCw className="h-3 w-3" />
          IN PROGRESS
        </span>
      );
    }
    if (status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 text-success px-2 py-0.5 text-[10px] font-mono font-bold">
          <Check className="h-3 w-3" />
          RESOLVED
        </span>
      );
    }
    return (
      <Badge variant="outline" className="font-mono text-[10px] uppercase">
        {status}
      </Badge>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary";

  return (
    <div id="contact-service" className="space-y-4 pt-6 border-t border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Contact Customer Service</h3>
            <Badge variant="outline" className="font-mono text-[10px]">
              SUPABASE TRACKED
            </Badge>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Submit complaints, bug reports, and billing questions with real-time status tracking.
          </p>
        </div>

        {/* Tab Switcher — the shared Apple-style segmented control (§3.5), not a hand-rolled one:
            an inactive tab rendered as `text-muted` on `bg-muted/40` composites to 3.78:1 and fails
            the /billing axe gate (the exact trap recorded in skills/ui_component_standards.md). */}
        <AppleSegmentedTabs
          tabs={
            [
              { key: "submit", label: "Submit Request" },
              { key: "track", label: "Track Ticket" },
            ] as const
          }
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Customer service mode"
        />
      </div>

      {activeTab === "submit" ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden p-0">
          <div className="h-1.5 w-full bg-primary" />
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-bold">Submit a Complaint, Comment, or Inquiry</CardTitle>
            <CardDescription className="text-xs">
              Every request is assigned a persistent reference ID stored in Supabase with audited
              resolution timestamps.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-4 space-y-4">
            {submittedTicket ? (
              <div className="rounded-xl bg-success/10 border border-success/30 p-5 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Request Submitted Successfully</h4>
                  <p className="text-xs text-muted mt-1">
                    Your reference ticket has been logged to Supabase. Keep it — it is the handle you
                    track the request with:
                  </p>
                  <p className="mt-2 font-mono font-bold text-sm text-primary select-all">
                    {submittedTicket}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmittedTicket(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted/20 cursor-pointer"
                  >
                    Submit Another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLookupTicketId(submittedTicket);
                      setLookupEmail((current) => current || email.trim());
                      setActiveTab("track");
                    }}
                    className="rounded-lg bg-primary text-white px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                  >
                    Track This Ticket
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="support-email" className="block text-xs font-semibold text-foreground mb-1">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="support-name" className="block text-xs font-semibold text-foreground mb-1">
                      Full Name
                    </label>
                    <input
                      id="support-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="support-category" className="block text-xs font-semibold text-foreground mb-1">
                      Request Category <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="support-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClass}
                    >
                      <option value="complaint">Complaint / Issue</option>
                      <option value="comment">Comment / Feedback</option>
                      <option value="billing">Billing &amp; Subscription</option>
                      <option value="bug">Bug / Accuracy Discrepancy</option>
                      <option value="general">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-product" className="block text-xs font-semibold text-foreground mb-1">
                      Relevant Product
                    </label>
                    <select
                      id="support-product"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className={inputClass}
                    >
                      <option value="general">General Factory / Platform</option>
                      <option value="billing">Factory Billing Portal</option>
                      <option value="ledgerlink">LedgerLink (Stripe Recon)</option>
                      <option value="facturgate">FacturGate (EU E-Invoice)</option>
                      <option value="parcelproof">ParcelProof (Carrier Audit)</option>
                      <option value="caseproof">CaseProof (Automation Capex)</option>
                      <option value="spendproof">SpendProof (AI FinOps)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="support-subject" className="block text-xs font-semibold text-foreground mb-1">
                    Subject Summary <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    required
                    maxLength={200}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your complaint or comment"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="support-message" className="block text-xs font-semibold text-foreground mb-1">
                    Details &amp; Description <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="support-message"
                    required
                    rows={4}
                    maxLength={4000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide specific details, error messages, or feedback..."
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-muted">
                    Stored in Supabase • Read back only with your ticket ID and email
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>Submit Request</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-base font-bold">Track Your Ticket</CardTitle>
            <CardDescription className="text-xs">
              Enter the reference ID you were given and the email address you filed it with — both are
              required, and only that ticket is returned.
            </CardDescription>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={lookupTicketId}
                  onChange={(e) => setLookupTicketId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadTicket(lookupTicketId, lookupEmail);
                  }}
                  placeholder="TKT-YYYYMMDD-XXXX"
                  className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3 py-2 font-mono text-xs text-foreground placeholder:text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadTicket(lookupTicketId, lookupEmail);
                }}
                placeholder="Email you filed it with"
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => loadTicket(lookupTicketId, lookupEmail)}
                disabled={loadingTickets}
                className="rounded-xl bg-primary text-white px-4 py-2 text-xs font-semibold hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              >
                Track
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            {trackError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {loadingTickets ? (
              <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Looking up your ticket…</span>
              </div>
            ) : tracked ? (
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5 transition-all hover:border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{tracked.ticket_id}</span>
                    {statusBadge(tracked.status)}
                    <span className="text-[10px] font-mono uppercase text-muted">• {tracked.category}</span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">
                    {tracked.created_at ? new Date(tracked.created_at).toLocaleString() : ""}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-xs text-foreground">{tracked.subject}</h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed whitespace-pre-wrap">
                    {tracked.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px]">
                  <div className="text-muted">
                    <span>Filed by: </span>
                    <span className="text-foreground font-medium">
                      {tracked.name ? `${tracked.name} (${tracked.email})` : tracked.email}
                    </span>
                  </div>
                  <div className="text-muted">
                    <span>Product: </span>
                    <span className="text-foreground font-mono font-semibold">{tracked.product}</span>
                  </div>
                </div>
              </div>
            ) : searched ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                <p className="text-xs font-semibold text-foreground">No ticket matches that pair</p>
                <p className="text-[11px] text-muted">
                  Check the reference ID and email — the lookup only returns a ticket when both match the
                  ones it was filed with. Internal status changes are made by our support desk.
                </p>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                <p className="text-xs font-semibold text-foreground">Track a request you have filed</p>
                <p className="text-[11px] text-muted">
                  Your reference ID is on the confirmation screen shown after you submit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
