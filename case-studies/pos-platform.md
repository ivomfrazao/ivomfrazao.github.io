---
title: Point-of-Sale Platform
company: Deloitte
role: Tech Experienced Senior
dateRange: Sep 2023 – Jun 2025
tags: [Architecture, ERP Integration, Retail, Stakeholder Management, Solo Engineering]
---

## The Situation

Two companies had just merged. The larger one ran its B2B rental workflow through an existing point-of-sale system that could not be disrupted — stores depended on it daily. The smaller one was running three separate legacy applications — covering inventory, contract management, and invoicing — that did not communicate with each other. Staff copied data manually between systems, sync errors were reported daily, and the UX across all three was outdated. None of them had a B2C flow. Everything had to be consolidated into a single platform, alongside the existing B2B workflow. The original deadline was six months.

The core constraint was that B2C could not simply be built independently. It had to coexist with the B2B flow, and in several places it had to conform to B2B process logic rather than the other way around.

## The Integration Problem

The legacy ERP had no documented API. No swagger, no BAPIs, no internal specs. The client's IT team could not help — the system had been running long enough that institutional knowledge of its internals had eroded.

The integration layer was built by reverse-engineering: observing the system's behaviour across different inputs, deriving column meanings from context, identifying undocumented filtering constraints, and mapping side effects that only appeared under specific conditions.

This was not a one-time exercise. New ERP integration challenges emerged throughout the project as assumptions proved incorrect or new flows touched parts of the system not yet mapped. Each one required the same approach: observe, derive, verify.

The integration layer had to survive across every subsequent ERP release. It did.

## The Alignment Problem

B2C constraints conflicted with the B2B process at multiple points. These were not technical conflicts — they were process conflicts that required decisions from people who owned those processes.

I engaged directly with directors across multiple departments to surface the constraints and work through them. The resolution was a hybrid approach: B2C was adapted to fit within the B2B process logic at the points where they intersected, and B2B was adapted where the ERP was not imposing a specific way of doing things and a change made operational sense. Neither flow was treated as fixed by default. Each significant decision of this kind required formal director-level sign-off and was obtained through the project's steering committee.

## The Solo Phase

After initial scoping and architecture, I became the sole engineer on the project for a sustained period. The manager remained in the background on governance, but technical and procedural decisions were mine to make.

During this phase:

- Continued reverse-engineering ERP integration issues as they emerged
- Redesigned affected flows end-to-end when prior architectural assumptions proved incorrect
- Ran steering committee meetings directly, presenting changes and obtaining approval
- Maintained compatibility with live B2B operations throughout

This phase was not planned — it was the result of delivery circumstances. The decisions made in it were consequential and could not wait for a review cycle.

## Team Phases

- **Phase 1 — Scoping and architecture:** me, manager, 2 designers, BA
- **Phase 2 — Core development:** me, manager; front-end developer built the initial UI as designed but left the project as the scope shifted toward integration work; I took over the UI layer as the flows developed
- **Phase 3 — Integration and redesign:** me solo, manager in background
- **Phase 4 — Post-launch:** me, junior developer (bugs and roadmapped features)

## Impact

- Delivered the full B2C+B2B platform with all scope intact, maintaining live B2B operations throughout. The original 6-month estimate did not account for ERP reverse-engineering requirements that were only discoverable through execution — each new flow touched unmapped parts of the system, and director-level negotiation rounds were required to resolve process conflicts between the merged companies' workflows
- Rolled out and trained 20 stores on the new platform

## What I'm Proud Of

**The solo phase.** Not just surviving it, but making consequential architecture and stakeholder decisions independently and getting them right. The redesigns that happened in that phase — where flows had to be rethought because an ERP assumption broke — required both technical clarity and the confidence to act without a second opinion.

**The ERP reverse-engineering.** There is a specific kind of problem-solving that only works when you slow down: when you have no documentation, you have to derive the truth from observation. That requires patience, rigour, and the willingness to hold your assumptions loosely until the evidence is solid. That skill was tested repeatedly on this project.
