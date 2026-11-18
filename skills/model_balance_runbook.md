# Model balance runbook (DeepSeek prepaid account)

**Owner decision 2026-11-18: `@Simon auto-recharge on` — answered, and the control does not exist.**
The DeepSeek API is prepaid only: its FAQ lists "How to Top Up" with no automatic option, the Open
Platform ToS §6.1 places the consequence of not recharging on the account holder, and top-ups are manual
by card, PayPal, Alipay or WeChat. The billing page answers CloudFront 403 from this host and no platform
login is stored here, so nothing can be toggled on the provider side from inside the factory.

The owner's intent — *the desk must never go dry in silence* — is code, not a setting:

| Piece | Where |
| --- | --- |
| Guard cron | Hermes job `Model Balance Guard`, id `85c92bbc59af`, `17 */3 * * *` UTC, no-agent, deliver `local` |
| Script | `~/.hermes/scripts/model_balance_guard.py` |
| State / burn history | `~/.hermes/state/model_balance_guard.json`, `model_balance_guard_history.jsonl` |
| Alert target | owner DM `slack:D0BTH9JHRMH` via `hermes send` (channel posts do not notify him) |

## What it does
1. `GET https://api.deepseek.com/user/balance` with the fleet key (`editorial-factory/scripts/frontier_llm.py`
   resolution order: `DEEPSEEK_API_KEY` env, then the profile `.env` files).
2. Records the reading and computes USD/day over the newest ≥20 h window (falls back to 3.00/day).
3. Silent above **6.00 USD**. DMs once per 12 h below 6.00 (≈2 days), and on **every** check below 2.00
   (<1 day), with the balance, the measured runway and the top-up link.
4. If the balance cannot be read at all it says so out loud — a guard that dies quietly is worse than none.

## What the sweep should do with it
- **Never queue `auto-recharge` again.** It is closed (queue row `resolved`, 2026-11-18).
- Read the guard's state file for the measured burn instead of assuming 3.00/day.
- Under ~6 USD, queue one plain top-up ask: the number, the date zero lands, the reply line. The guard
  signals; it cannot pay.
- A dry-out is an outage, not a forecast: count the 402-stamped runs and the blank publishing days, and
  name what the silence cost.

## Manual top-up (owner)
`https://platform.deepseek.com/top_up` — 20 USD ≈ 6–7 days at the measured burn. Confirm with
`GET /user/balance` after the charge; the balance endpoint is the only proof a top-up landed.
