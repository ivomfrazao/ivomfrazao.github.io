---
title: Construction Site Management App
company: Deloitte
role: Tech Consultant
dateRange: Jan 2021 – Apr 2021
tags: [SAP Integration, Sync Engine, State Machine, Architecture, Tablet]
tldrProblem: A construction client needed real-time SAP integration on a tablet app, but the APIs had no JOIN support and column meanings had to be reverse-engineered with no documentation.
tldrDid: Mapped the SAP data model from systematic observation, then redesigned a timer-based sync as an explicit state machine with conditional transitions, bidirectional writes, inconsistency detection, and chunked paging.
tldrOutcome: A legible, observable sync engine that handled the full data complexity — making a difficult integration correct and transparent without documented API support.
---

## The Situation

The core engineering challenge was a two-tier sync architecture between the app and SAP — this case study covers the server-side engine, the more complex of the two tiers.

A construction company needed a tablet application to manage equipment and budgets across active construction sites. Project managers on-site needed real-time visibility into the data held in SAP — what equipment was allocated where, what budget had been consumed, what was still available. But they also needed to act: signing off machines as leaving a site and making them available for reallocation, reporting spending differences, scheduling personnel. Those actions needed to reach SAP, not just stay in the app — and not all of them with the same urgency.

The sync architecture had two tiers. The first — and the more complex — was a server-side engine that exchanged data with SAP bidirectionally and loaded the results into the app's backend. The second was a simpler downstream sync that pushed already-preprocessed data from the backend to each tablet's local storage, scoped to the constructions relevant to that device. The state machine described here is the first tier.

The integration challenge was immediate. The client's SAP APIs had no JOIN support — each call returned flat results from a single table, with no way to retrieve related data in a single round trip. Column names were opaque, and there was no documentation mapping them to their business meaning. The institutional knowledge of what each field represented had eroded over the years the system had been in use.

## The Integration Constraint

Before any sync logic could be built, the data model had to be reverse-engineered from observation.

This meant calling each API endpoint under different conditions, cross-referencing results with known business states, and deriving what each column actually represented from context rather than documentation. Where that wasn't enough, we read the underlying ABAP code — sometimes to confirm what we had observed, sometimes to explain behaviour that seemed inconsistent with our model. The ABAP itself was brittle: it worked, but its rationale and sequencing were obscure enough that observation was often the faster path to understanding. The code could confirm a hypothesis; it rarely explained one.

With the column meanings mapped, the next constraint was the absence of JOINs. Assembling a coherent view of a construction's state required issuing multiple sequential API calls and joining the results in memory on the server side. The order of those calls was not always fixed: depending on what data had already been loaded and what had changed that day, some calls could be skipped entirely, while others became necessary only after earlier results were known. Timeouts on large result sets were also a real concern, which drove a chunked paging approach — data was fetched per construction, and some constructions fit within a single page while others required several.

## The Sync Engine Design

The first approach was a sequence of timers: each step fired after a fixed delay, handing off to the next. It worked for the simple cases but became brittle as the data dependencies grew. The join sequence was conditional — what needed to be fetched next depended on what the previous fetch had returned — and a fixed timer sequence had no way to express that.

The sync engine was redesigned as an explicit **state machine**.

Each sync run moved through defined states: initialising, fetching a chunk, storing that chunk, advancing to the next stage, and completing. The machine tracked what the next stage to call was, and transitions were controlled by what had been loaded so far. If a construction's data was fully covered by the first page, the engine advanced past the paging stages. If a delta that day required a join that was otherwise optional, the engine could make that stage mandatory. The machine knew what to do next; the timers never could.

**The sync was bidirectional.** Changes recorded in the app also needed to reach SAP, but not all changes had the same urgency. Time-sensitive or simpler writes — a machine signed off from a site, a personnel schedule update — were applied immediately to both the app's backend and SAP directly. Less time-sensitive changes were queued in the backend and flushed to SAP as part of the next sync run, where they could be processed alongside the read pass rather than as a separate operation.

**Inconsistency detection** emerged as a natural addition. Because some changes could be made in both the app and SAP directly, there was a real risk that the two systems would diverge — a change applied in one but not the other, or applied differently. A dedicated stage compared the app's backend state against what the sync read from SAP and flagged discrepancies for review, making the sync engine an ongoing integrity check on the integration it was part of.

**Admin visibility** was a direct benefit of making states explicit. Rather than asking an administrator to read through logs, the engine surfaced exactly which stage it was in and, when failures occurred, at what stage and with what error. The same structure that made the logic predictable also made it observable.

**Chunked processing** handled the scale constraint. Tables were paged per construction. The engine tracked which chunk it had last successfully persisted, so progress within a construction was not lost on a failure.

**Failure handling** distinguished between known transient errors — network drops, API timeouts — and errors that were not recoverable. Transient errors triggered a retry, up to a configured limit per sync run. Once that limit was reached, or if the error was not a known transient type, the sync stopped: administrators were notified and the data was marked stale for users. Administrators could also manually launch a new sync instance if they wanted to retry rather than wait for the next scheduled run.

The result was a sync process that was **legible under complexity**: with dozens of batches, in-memory joins, write-backs, and consistency checks involved in a full run, the state machine gave each unit of work a name and made the overall process something that could be reasoned about, not just observed.

The downstream tier — syncing preprocessed data from the backend to each tablet's local storage — was comparatively straightforward: scoped to the constructions relevant to each device, it consumed what the server-side engine had already cleaned and joined.

## What I'm Proud Of

**Choosing the state machine over the timer sequence.** The timers worked at first and would have been faster to extend. But the join logic was inherently conditional — what to fetch next depended on what had already come back — and that conditionality had nowhere to live in a fixed timer chain. Making the states and transitions explicit was the only way to express the actual logic cleanly, and it paid off every time the sequence needed to change.

**The inconsistency detection as an emergent safeguard.** The comparison between app state and SAP state was a natural consequence of a bidirectional sync, and adding a stage to surface discrepancies required very little extra work. The outcome was an integrity check built into the integration itself — the sync that moved data also verified it, without those being separate concerns.

**Admin observability as a design outcome, not an afterthought.** Because every stage was named and the machine knew where it was at all times, surfacing that state to administrators required almost no additional work. The structure that made the engine correct was the same structure that made it transparent.

**The reverse-engineering discipline.** This one had a wrinkle the POS ERP didn't: when observation wasn't enough, we read the ABAP. Not to understand the codebase — the code was brittle and its rationale was obscure — but to confirm or rule out a hypothesis faster than another round of test calls would. Knowing when to switch from observation to source inspection, and back again, is a judgement call that only works if you're willing to be wrong about your model right up until the evidence is conclusive.
