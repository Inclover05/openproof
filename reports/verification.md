# Verification record

Evidence gathered 26 September 2026 UTC. Live behavior and controlled fixtures are separated below.

## Live results

| Check | Evidence | Result |
|---|---|---|
| Corrected contract deployment | deployment.json; 0xae4862375dcdad10086d8c163a33b8e399e9e112713fa850fbf235beaf6d6f90 | ACCEPTED, FINISHED_WITH_RETURN when observed |
| Independent public-source retrieval | probe-github-v3.json, probe-docs-v3.json | Both readable; five validator votes AGREE |
| Missing public source | probe-blocked-v3.json | Blocked; five votes AGREE |
| Chain identity inside GenVM | Three v3 probes | Ethereum 0x1, Base 0x2105 |
| Contract-owned judgment | live-case.json; 0x83c828ab3977acdddf1be2b6309f3264cdd5670c40e27a2ed0feb66901c2882e | FINISHED_WITH_RETURN; five AGREE; Insufficient evidence / SOURCE_NOT_SUFFICIENT |
| Exact transaction association | App network endpoint | Recipient, method, canonical payload and on-chain input hash matched; persisted result in appeal window |
| Historical Ethereum boundary | Live case | Block 25,878,704 at 2026-08-31 23:59:59 UTC; following block after cutoff |
| Historical contract state | Same case | HTTP 403 for eth_getCode; unavailable retained explicitly |
| API saving/read-back | Evidence → immutable snapshot → case | Real D1 persistence |
| WebMCP | Browser start_case | Valid input opened correct form; invalid input failed and preserved existing value |

Source probes used v3. Active v4 fixes the AI JSON response handling and avoids mutating the strict-equivalence result. The live judgment used v4. Earlier unsuccessful revisions are retained in reports.

## Costs and limits

The isolated live judgment estimate was **0.0001713025310535 test GEN**. The account's observed balance change across that submission was **0.000163472504496 test GEN**. This is one measurement, not a fee guarantee or complete refund profile. The protocol returned a zero appeal bond at observation; an appeal transaction would still incur gas. No appeal was submitted.

The v4 deployment initially changed the balance by approximately **0.00102074 test GEN**. Later deployment balance observations also include subsequent tests; use the isolated judgment's balance fields for its cost.

Each source/RPC request has a 10-second timeout. Bounded historical bracketing and binary search can require several dozen requests. Consensus latency varies; no SLA is established. API mutations are limited to ten requests per five minutes per IP/action. Provider archive access and quotas are not guaranteed.

## Controlled checks

- 12 direct contract tests passed: three template matches, changed-value contradictions, unrelated source, duplicate case, inaccessible/changing source, RPC timeout, wrong chain, malformed ABI, invalid time boundary, private URL and unsupported getter rejection.
- Five Node checks passed: SSRF restrictions/redirects, execution-aware lifecycle, bounded scope, cutoff mapping/wrong chain, missing-state anchoring without fabricated values.
- Desktop and 390px mobile live-case pages rendered with no observed JavaScript errors. Screenshots are local in reports and excluded from source packaging.

The direct runner (genlayer-test 0.29.2 with SDK artifact v0.2.14) cannot decode sandbox validator replay (`unknown type 14`). Local tests exercise repeated execution and changed observations, not full protocol consensus. The five-validator votes above are real network evidence.

## Remaining acceptance work

- Real dated promises producing Supported/Contradicted for each template on the network.
- Deep historical state on both chains through independently reachable archive endpoints.
- Injected-wallet behavior and reputation check on the deployed domain.
- Live appeals, refunds, adversarial disagreement and induced undetermined paths.
- Unprepared stranger usability review after an explicit change from owner-private audience.

This is a functioning testnet beta, not a fully validated public adjudication service. No Builder portal submission has been made.

## Primary references

- [GenLayer web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [Testing](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [Network configuration](https://docs.genlayer.com/developers/intelligent-contracts/deploying/network-configuration)
- [PublicNode RPC and archive access](https://www.publicnode.com/)

Installed SDK 1.1.8 source and actual transaction responses were also used to verify behavior.

Finality follow-up: the live judgment reached FINALIZED with FINISHED_WITH_RETURN and the same five AGREE votes. The app read the finalized result successfully. TypeScript and scoped ESLint checks passed.

The complete 390px mobile browser journey passed: entered a new case, collected real evidence, reviewed, saved to D1, and reloaded the saved URL successfully. No JavaScript errors were reported. Browser case ID: 0a753723-8760-4c44-a6f5-e1b552d0d4fd (local verification record).
