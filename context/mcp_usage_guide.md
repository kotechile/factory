# Model Context Protocol (MCP) & WebMCP Integration Guide

The **Autonomous Product & Software Factory** (`apps.giniloh.com`) exposes every deterministic tool as an agent-callable Model Context Protocol (MCP) tool. Autonomous agents, LLMs, and ERP pipelines can invoke these tools in-browser via the emerging W3C WebMCP standard (`navigator.modelContext`) or server-side via the metered HTTP agent endpoint.

---

## 1. Quick Reference & Surface Overview

- **Canonical Manifest**: [`https://apps.giniloh.com/.well-known/mcp.json`](https://apps.giniloh.com/.well-known/mcp.json)
- **Agent API Endpoint**: `POST https://apps.giniloh.com/api/agent/calculate`
- **Tool Selector Header**: `x-webmcp-tool: <tool_name>`
- **Billing & Auth Header**: `x-customer-id: <cus_...>` (optional Stripe customer ID; sending it meters the call at that tool's rate and bills it monthly, omitting it runs the tool unbilled)
- **Interactive Directory**: [`https://apps.giniloh.com/showcase`](https://apps.giniloh.com/showcase)

### Active Factory MCP Tools

| Tool Name | Product | Description | Required Parameters |
| :--- | :--- | :--- | :--- |
| `reconcile_stripe_payout` | **LedgerLink** | Decomposes netted Stripe payout into balanced GL journal lines (ASC 606 / IFRS 15). | `account_id`, `period` |
| `validate_einvoice` | **FacturGate** | Pre-send compliance gate for EU e-invoices (EN 16931 / CIUS-FR overlay). | None (accepts `xml` or `invoice`) |
| `convert_invoice_to_facturx` | **FacturGate** | Converts canonical model into compliant Factur-X / CII / UBL 2.1 XML. | `invoice` |
| `check_eu_vat_id` | **FacturGate** | Offline VAT format & mathematical checksum validator across EU member states. | `vat_id`, `country` |
| `audit_carrier_invoice` | **ParcelProof** | Audits UPS/FedEx/USPS parcel invoices against shipment records for overcharges. | `shipment_records`, `invoice_lines` |
| `compute_billable_weight` | **ParcelProof** | Computes carrier DIM-weight billing basis from dimensions and service divisor. | `carrier`, `service`, `ship_date`, `length`, `width`, `height`, `actual_weight_lb` |
| `audit_automation_case` | **CaseProof** | Audits buyer-side warehouse-automation business case (depreciation, NPV, payback). | `case` |
| `compare_automation_bids` | **CaseProof** | Normalizes competing Capex vs Lease vs RaaS automation proposals. | `case` |
| `after_tax_payback` | **CaseProof** | §179 phase-out and after-tax payback timeline for capital equipment. | `case` |

---

## 2. Using the MCP via In-Browser WebMCP

In browsers or webview environments with WebMCP support (such as Chrome with WebMCP flags or AI agent-driven browser extensions), all factory tools are automatically registered into the browser's model context on page mount via `src/components/webmcp-provider.tsx`.

### Invocation Example

```javascript
// Check if WebMCP is active in the environment
if (typeof navigator !== "undefined" && navigator.modelContext) {
  // Execute the tool directly from in-page agent context
  const reconciliation = await navigator.modelContext.executeTool("reconcile_stripe_payout", {
    account_id: "acct_1AaBbCc",
    period: "2026-08",
    export_json: JSON.stringify({
      payout: { id: "po_1NqK2t2eZvKYlo2C", amount: 437821, currency: "usd" },
      balance_transactions: [
        { id: "txn_1", type: "charge", amount: 512000, fee: 14279, net: 497721 },
        { id: "txn_2", type: "refund", amount: -42000, fee: 0, net: -42000 },
        { id: "txn_3", type: "adjustment", amount: -17900, fee: 0, net: -17900 }
      ]
    })
  });

  console.log("Reconciliation Invariant Passed:", reconciliation.reconciled);
  console.log("GL Journal Lines:", reconciliation.journalLines);
}
```

---

## 3. Using the MCP via HTTP / REST Agent API

Any LLM framework (LangChain, LlamaIndex, AutoGen, CrewAI), backend service, or CLI script can invoke tools directly over HTTP.

### cURL Invocation

```bash
curl -X POST https://apps.giniloh.com/api/agent/calculate \
  -H "Content-Type: application/json" \
  -H "x-webmcp-tool: reconcile_stripe_payout" \
  -H "x-customer-id: cus_OptionalStripeCustomerId" \
  -d '{
    "account_id": "acct_1AaBbCc",
    "period": "2026-08",
    "export_json": "{\"payout\": {\"id\": \"po_1NqK2t...\", \"amount\": 437821, \"currency\": \"usd\"}, \"balance_transactions\": [...]}"
  }'
```

### Python (Requests / httpx)

```python
import httpx
import json

payload = {
    "account_id": "acct_1AaBbCc",
    "period": "2026-08",
    "export_json": json.dumps({
        "payout": {"id": "po_1NqK2t...", "amount": 437821, "currency": "usd"},
        "balance_transactions": [...]
    })
}

headers = {
    "Content-Type": "application/json",
    "x-webmcp-tool": "reconcile_stripe_payout",
    "x-customer-id": "cus_OptionalCustomerId"
}

response = httpx.post(
    "https://apps.giniloh.com/api/agent/calculate",
    json=payload,
    headers=headers,
    timeout=15.0
)

data = response.json()
print("Reconciled:", data["data"]["reconciled"])
print("Journal Lines:", len(data["data"]["journalLines"]))
```

### TypeScript / Node.js (Fetch)

```typescript
const response = await fetch("https://apps.giniloh.com/api/agent/calculate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webmcp-tool": "reconcile_stripe_payout",
    "x-customer-id": "cus_OptionalCustomerId",
  },
  body: JSON.stringify({
    account_id: "acct_1AaBbCc",
    period: "2026-08",
    export_json: JSON.stringify(stripePayoutExport),
  }),
});

const result = await response.json();
if (result.success) {
  console.log("Journal Lines:", result.data.journalLines);
}
```

---

## 4. MCP Client Configuration (Cursor, Claude Desktop, Windsurf, Cline)

To integrate the factory's tool suite into desktop AI coding environments or assistants, register the server via an MCP fetch bridge.

### Claude Desktop (`claude_desktop_config.json`)

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "software-factory-tools": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://apps.giniloh.com/.well-known/mcp.json"
      ]
    }
  }
}
```

### Cursor IDE MCP Integration

In **Cursor Settings > Features > MCP**:
1. Click **+ Add New MCP Server**.
2. **Name**: `software-factory-tools`
3. **Type**: `command`
4. **Command**: `npx -y @modelcontextprotocol/server-fetch https://apps.giniloh.com/.well-known/mcp.json`

---

## 5. Input & Output Contract for `reconcile_stripe_payout`

### Request Parameters

- `account_id` (*string, required*): The Stripe account ID whose payout is being reconciled (e.g. `acct_1AaBbCc`).
- `period` (*string, required*): The period being reconciled (e.g. `2026-08` or a timestamp range `start:end`).
- `export_json` (*string, optional*): Stringified JSON export containing `{ "payout": {...}, "balance_transactions": [...] }`. Required if `stripe_restricted_key` is omitted.
- `stripe_restricted_key` (*string, optional*): Customer read-only Stripe restricted key (`rk_...`) scoped to payouts and balance transactions. Required if `export_json` is omitted.
- `payout_id` (*string, optional*): Target specific payout ID (e.g. `po_1NqK2t...`). If omitted, reconciles the latest payout in the period.

### Response Shape

```json
{
  "success": true,
  "data": {
    "payout": {
      "id": "po_1NqK2t2eZvKYlo2C",
      "amount": 437821,
      "currency": "usd",
      "arrival_date": 1723723200
    },
    "journalLines": [
      {
        "date": "2026-08-15",
        "account": "Stripe Clearing (Gross Charges)",
        "debit": 0,
        "credit": 512000,
        "reference": "ch_1..."
      },
      {
        "date": "2026-08-15",
        "account": "Returns & Allowances",
        "debit": 42000,
        "credit": 0,
        "reference": "re_1..."
      },
      {
        "date": "2026-08-15",
        "account": "Payment Processing Fees",
        "debit": 14279,
        "credit": 0,
        "reference": "fee_1..."
      },
      {
        "date": "2026-08-15",
        "account": "Foreign Exchange Loss",
        "debit": 17900,
        "credit": 0,
        "reference": "adj_1..."
      },
      {
        "date": "2026-08-15",
        "account": "Bank Operating Account",
        "debit": 437821,
        "credit": 0,
        "reference": "po_1NqK2t..."
      }
    ],
    "reconciled": true,
    "summary": {
      "grossCharges": 512000,
      "refunds": 42000,
      "fees": 14279,
      "adjustments": 17900,
      "netPayout": 437821
    }
  },
  "metering": {
    "meteredUsageReported": false,
    "usageRecorded": false,
    "meteredCents": 25,
    "costPerQueryUsd": 0.25
  },
  "computedAt": "2026-10-03T18:45:00.000Z"
}
```

> The rates above are per tool — `reconcile_stripe_payout` is $0.25, `check_eu_vat_id` is $0.05,
> `audit_automation_case` is $0.50. Read `pricing.rates_by_tool` in the manifest for the current
> value rather than assuming one flat price. This example sent no `x-customer-id`, so nothing was
> metered (`meteredUsageReported` and `usageRecorded` false); with the header set, both flip to
> true, a `meterEventId` appears, and the call is billed at the tool's rate.

---

## 6. Non-Negotiable Invariants & Guarantees

1. **Deterministic Core**: All calculations run pure algebraic models; no hallucinated line items or unprovable rounding drift.
2. **Zero Egress in Browser Mode**: When using `export_json` in the web UI, raw payout transaction details never leave the user's browser.
3. **Asc 606 / IFRS 15 Compliance**: Reconciled entries satisfy double-entry accounting invariants:
   $$\sum \text{Credits} - \sum \text{Debits} = 0$$
   $$\sum \text{Line Items Net} \equiv \text{payout.amount}$$
4. **Explicit Failure (No Degraded Fallback)**: Missing parameters or unbalanced data return an explicit 400 error rather than a partial guess.
