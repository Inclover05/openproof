# OpenProof: what it does and what to expect

I built OpenProof to help people ask a narrower, fairer version of "Did this project do what it said?" It brings together a specific public claim, when there is one, and an observable blockchain value at a chosen moment. The result is a case that someone else can inspect, including the gaps in the evidence.

A familiar comparison is a Lagos vendor promising to dispatch an order on Friday. The message and the dispatch record answer different parts of the question. OpenProof applies that discipline to a limited set of smart contract facts. It does not connect to delivery services, banks, or contribution accounts.

## Where OpenProof can be useful

I designed it for questions that can be tied to one contract field on Ethereum or Base and a past cutoff time. For example:

- **Who owned a contract then?** Compare owner() with a specific address at the cutoff. This can help a community examine a published claim about a contract owner.
- **Was an unlock date late enough?** Compare unlockTime() with a minimum timestamp. Think of an ajo or esusu group in Nigeria agreeing on a payout date: if its rules were represented by a supported smart contract, the stored unlock time is one fact to inspect. OpenProof does not determine whether every route for moving funds was blocked.
- **Which implementation did a proxy use?** Compare its EIP-1967 implementation address with the expected address. This helps with a precise question about an upgrade, where that proxy standard applies.
- **Does a public statement support the question?** An accessible X post, Medium article, GitHub page, or supported official source can be reviewed alongside the historical contract value. A readable link still has to state the relevant, dated promise.

These examples explain possible uses. They are not claims about a particular Nigerian group, seller, or token project.

## The two ways to ask a question

| Mode | What you provide | What the result means |
| --- | --- | --- |
| Public promise | A source for a specific dated promise, plus the contract and historical comparison | Whether eligible evidence supports, conflicts with, or cannot establish that precise promise and comparison |
| Contract state | A contract, supported field, cutoff, and expected value; no promise source required | Whether the historical field matches the expected value, without claiming anyone made a promise |

I keep these modes separate because a blockchain value alone cannot tell us what someone publicly promised. If you only need the historical fact, Contract state is the clearer choice.

---

## What you can expect when using the website

### First, you define a question

You choose Ethereum or Base, enter a contract address, select one supported field, specify an expected value, and choose a past cutoff. You also write a neutral statement explaining what you want to compare. Public promise mode asks for a relevant source link.

The cutoff is entered in UTC. For someone in Nigeria, **08:00 UTC is 09:00 WAT**. A future cutoff, incomplete address, or unsupported field should produce a validation message rather than a case.

I support three bounded field checks:

| Field | What OpenProof compares | Important limit |
| --- | --- | --- |
| owner() | The returned owner address against an expected address | Other admin roles and real-world control may differ |
| unlockTime() | The returned timestamp against a minimum timestamp | This does not prove that funds could never move through another path |
| EIP-1967 implementation | The implementation address against an expected address | Other upgrade patterns are outside this check |

### Next, you review the evidence preview

The website looks for the finalized block at the cutoff and confirms that the following block is later. It reads the selected field at the historical block, then shows the chain, block, value, source access, and available hashes. You can inspect those details before connecting a wallet.

A source link has its own access check. If it cannot be read, the page should show the failure. It should not quietly treat the source as verified. The preview is a time-limited snapshot; after 15 minutes, you need to collect it again before saving.

### Then, you save or revise

Saving a case does not require a wallet or gas. The saved page retains the question and evidence snapshot. A **Draft** is a record of what was collected, not a network verdict. Repeating the same save returns the same case. If you change the question, "Create revised case" starts a new record and leaves the original available.

This separation matters: you can share the reviewed evidence and decide whether the question is ready for network assessment. It also prevents a later edit from silently changing an existing case.

---

## What happens when you request a decision

To submit a saved case, you connect a browser wallet to **GenLayer Bradbury testnet** and hold enough test GEN for network gas. The website shows a fresh fee estimate before signing. That estimate lasts two minutes and can change; it is not a fixed project fee. You should see the selected account, network, recipient, and case information in the signing flow.

After you approve, the page tracks the transaction, execution, and lifecycle. A pending transaction may take time. If tracking is interrupted, the saved transaction ID can be used to resume. An accepted transaction can still fail during execution, so I do not present transaction acceptance alone as a decision.

The GenLayer Intelligent Contract independently retrieves the reviewed sources and historical blockchain data. Validators apply the contract's bounded rules and agree on the required decision fields. The website displays that recorded result; it does not select a favourable outcome.

| Outcome | What I mean by it | What you should avoid assuming |
| --- | --- | --- |
| Supported | The eligible evidence supports this exact question | That the whole project is safe or every promise was kept |
| Contradicted | The eligible evidence conflicts with this exact question | That someone intended to mislead people |
| Insufficient evidence | A required fact could not be established | That the claim was false |

For example, if the expected owner address matches the value at the historical block, a Contract state case can be Supported. If it differs, it can be Contradicted. If the historical value cannot be retrieved, or a source never states the required promise, Insufficient evidence is the honest result. The question, field, and cutoff define the scope of every outcome.

A successful decision can still have an appeal window before finalization. The case page shows lifecycle information returned by the network. This release does not provide a public button for signing an appeal.

---

## What to expect from X, Medium, and other links

A direct public X post can be considered as text through X's public embed endpoint. A Medium article can be considered when its public article body is readable. The website keeps the original URL and shows the source access result. You can add a separate corroborating source while keeping the original visible.

A reachable link is only a source candidate. A post about a different contract, a profile page instead of a direct post, or an article without the precise promise will not establish the question. A blocked page can leave the case with insufficient evidence. Login walls, paywalls, deleted posts, images, videos, and whole threads are not treated as verified article or post text.

Some publication dates come from the page itself. A page visible today does not independently prove that the same words were online before your chosen cutoff. I make that distinction visible because historical timing can be essential to a promise.

OpenProof uses a supported-host policy and refuses private-network source addresses and silent redirects. These checks protect the evidence collection process, but they also mean some otherwise public pages cannot be used directly. If an official, accessible permalink independently states the same precise dated promise, add it as corroboration. If it does not, the missing fact should remain missing.

## Privacy and sharing

A saved case on the public website can be opened by anyone who has its URL. A submitted Bradbury transaction is public on the testnet. I therefore ask users to keep private information, seed phrases, and private keys out of statements and source fields. OpenProof needs a wallet signature only when you choose to submit; reading and saving do not require one.

The project repository is private. The public application and shareable case URLs are separate from repository access. If you need to show someone the code, I must give them access to the repository.

---

## What OpenProof does not establish

I keep the conclusion as narrow as the question. An owner() result does not list every administrative role or prove who controls an address in real life. An unlockTime() result does not prove continuous locking or cover every withdrawal path. An EIP-1967 result does not cover every type of proxy or upgrade. A contract value does not reveal motives.

OpenProof is a beta for these bounded evidence questions. It is not a general fact checker, a security audit, legal advice, a guarantee about a token, or proof that a source existed at the chosen time. Blockchain data providers, public websites, and the Bradbury testnet can be unavailable or rate-limit access. If a required fact cannot be independently obtained, I expect an explicit gap or failure state rather than a substituted current value.

My Nigerian examples are analogies that help explain the product. OpenProof does not verify bank transfers, naira payments, delivery receipts, government records, or an actual ajo group's accounts.

## The decision contract and project links

My current main OpenProof Intelligent Contract is **version 2 on GenLayer Bradbury**, chain ID **4221**:

**0xB74B3339695C50C6d16168708e2B22A7D6D72EAB**

Read the contract record: https://explorer-bradbury.genlayer.com/address/0xB74B3339695C50C6d16168708e2B22A7D6D72EAB

The earlier OpenProof version 1 address is **0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe**. It remains relevant to older records. Addresses such as Base USDC or the Base bridge are contracts a case might inspect; they are not additional OpenProof decision contracts.

- Website: https://openproof-three.vercel.app
- Source repository: https://github.com/Inclover05/openproof (private)
- GenLayer web access reference: https://docs.genlayer.com/developers/intelligent-contracts/features/web-access
- GenLayer transaction reference: https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions

If I explain one result to someone else, I show them the saved question, the source access and hashes, the historical block and value, the network execution, and whether the decision has finalized. Those details let them understand what OpenProof did and where its answer ends.
