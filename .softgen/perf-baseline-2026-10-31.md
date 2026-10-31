# Performance Baseline — Before Phase 1 Deploy

Captured: 2026-10-31 02:56:42 UTC (read-only queries; production still running pre-Phase-1 code)
Rollback point: git tag perf-phase1-baseline -> 0d43485 (2026-10-31 02:09:45 UTC)
pg_stat_statements stats_reset: 2026-08-22 18:54:21 UTC (cumulative counters — do NOT reset)

## Totals
- Total query calls: 3,655,664
- Total execution time: 16,091,632 ms
- Connections: 27 total, 2 active, max 60

## Key metric groups
| Metric | Calls | Total ms | Mean ms |
|---|---|---|---|
| Realtime polling (realtime.list_changes) | 2,083,353 | 13,804,822 | 3.26 (main statement 6.63) |
| Realtime setup (pg_publication_tables, all variants) | 75,178 | 61,908 | 1.48 |
| Realtime setup (main lookup statement) | 35,838 | 36,585 | 1.02 |
| Security-alert queries (anti_fraud_security_alerts) | 42,172 | 3,314 | 3.86 |
| stamp_transactions app queries | 8,085 | 1,043,201 | 30.08 |
| rewards app queries | 8,320 | 456,875 | 14.97 |

Active Realtime subscriptions at capture (realtime.subscription): 0 rows (point-in-time only).

## Top statements by total time
| Statement | Calls | Total ms | Mean ms |
|---|---|---|---|
| Realtime WAL change polling | 2,083,378 | 13,804,983 | 6.63 |
| stamp_transactions count, business-filtered (a) | 1,049 | 438,381 | 417.90 |
| stamp_transactions count, business-filtered (b) | 1,406 | 247,999 | 176.39 |
| stamp_transactions count, unfiltered (a) | 654 | 185,668 | 283.90 |
| pg_timezone_names (API schema refresh) | 1,830 | 178,635 | 97.61 |
| rewards count, business-filtered (a) | 1,049 | 141,201 | 134.61 |
| rewards count, business + status (a) | 1,049 | 136,443 | 130.07 |
| stamp_transactions count, unfiltered (b) | 882 | 118,068 | 133.86 |
| rewards count, business-filtered (b) | 1,406 | 76,229 | 54.22 |
| rewards count, business + status (b) | 1,406 | 72,449 | 51.53 |
| API schema base types (a) | 1,699 | 55,213 | 32.50 |
| API schema base types (b) | 1,830 | 50,020 | 27.33 |
| RPC with p_business_id / p_actor | 502 | 43,640 | 86.93 |
| stamp_transactions recent activity | 2,455 | 40,173 | 16.36 |
| Realtime publication tables lookup | 35,838 | 36,585 | 1.02 |

## Comparison method
1. Snapshot S0 = this file (02:56:42 UTC).
2. Snapshot S1 at the moment Phase 1 is published.
3. Snapshot S2 after production testing (ideally several hours of normal use).
4. Before rate = (S1 - S0) / hours; After rate = (S2 - S1) / hours, for each metric above.

## Measured vs estimated
- Measured (database statistics): query calls, execution time, Realtime polling, Realtime setup churn, security-alert query frequency, connections, Realtime subscriptions (point-in-time).
- Requires user-provided data: dashboard load time (browser DevTools), API response times (Vercel logs/analytics), database CPU (Supabase dashboard).
- Otherwise reported as code-based estimates and labeled as such.