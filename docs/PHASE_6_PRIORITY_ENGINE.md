# FDR-Chain — Phase 6: Priority Calculation Engine

## 1. Engine Overview
The **Priority Calculation Engine** (`app.services.priority_service.PriorityService`) is a centralized, deterministic scoring engine that computes operational priority scores and assigns actionable priority levels to officer tasks.

Its primary function is to optimize officer attention by surfacing urgent regulatory compliance breaches, bank unresponsiveness, and approaching statutory deadlines without human latency.

---

## 2. Mathematical Scoring Model

The priority score $S$ for a task is calculated as the sum of active independent risk signals:

$$S = \sum_{i=1}^{n} w_i \cdot \mathbb{I}(\text{signal}_i)$$

Where:
- $w_i \in \mathbb{N}$ is the configured point weight for signal $i$.
- $\mathbb{I}(\text{signal}_i) \in \{0, 1\}$ is the boolean indicator function evaluated against the source record, current timestamp, and escalation state.

### Configurable Signal Weights (Government Baseline)

| Signal Code | Description | Default Weight | Trigger Condition |
| :--- | :--- | :---: | :--- |
| `broken_fdr` | Broken FDR / Lien Breach | **+100** | FDR has `lifecycle_status == 'broken'` or `lien_status == 'discharged'`. |
| `unresponsive_heartbeat` | Unresponsive Depository Branch | **+70** | Monitored deposit has missed 3+ consecutive verification pings (`is_unresponsive == True`). |
| `stale_heartbeat` | Stale Heartbeat Cadence | **+40** | Depository verification ping older than policy threshold (`is_stale == True`). |
| `deadline_exceeded` | Statutory SLA Exceeded | **+50** | Task `due_at < now()` and task is not completed. |
| `deadline_within_24h` | Imminent Deadline (< 24h) | **+35** | Task `now() \le due_at \le now() + 24\text{ hours}`. |
| `deadline_within_7d` | Approaching Deadline (< 7d) | **+20** | Task `now() + 24\text{ hours} < due_at \le now() + 7\text{ days}`. |
| `renewal_awaiting_review` | Renewal Awaiting Review | **+20** | Source is a submitted renewal case with status `under_review` or `submitted`. |
| `missing_evidence` | Missing Required Evidence | **+15** | Renewal or deposit registration is missing required deposit certificate or bank letter. |
| `escalated_case` | Formally Escalated | **+30** | Task has active, unresolved supervisory escalation records. |

---

## 3. Mutual Exclusivity & Double-Counting Prevention

To prevent artificial score inflation:
1. **Deadline Proximity Hierarchy**:
   - `deadline_exceeded`, `deadline_within_24h`, and `deadline_within_7d` are mutually exclusive.
   - If a deadline has passed, only `deadline_exceeded` (+50) is awarded; proximity points are omitted.
   - If within 24 hours, only `deadline_within_24h` (+35) is awarded; the 7-day bracket (+20) is omitted.
2. **Heartbeat Hierarchy**:
   - If a deposit is `broken`, it represents an outright collateral breach. While `unresponsive_heartbeat` may co-occur if recorded by upstream alerts, the engine applies discrete signal checks without double-triggering the same alert rule.

---

## 4. Priority Level Thresholds

Calculated scores map directly to four operational tiers:

| Priority Level | Score Range | Operational SLA & Action |
| :--- | :---: | :--- |
| **Critical** | $S \ge 100$ | Immediate supervisor notification; 24-hour resolution SLA; auto-escalates if unresolved. |
| **High** | $70 \le S < 100$ | 48-hour resolution SLA; highlighted in officer queue. |
| **Medium** | $35 \le S < 70$ | Standard 5-day review SLA. |
| **Low** | $S < 35$ | Routine queue item; standard processing window. |

---

## 5. Non-Destructive Invariant

> **CRITICAL ARCHITECTURAL GUARANTEE**  
> Priority calculation is strictly an **ordering and surveillance heuristic**. Under no circumstances does the priority service modify financial liens, approve renewals, release FDRs, or transition lifecycle statuses of underlying domain models.
