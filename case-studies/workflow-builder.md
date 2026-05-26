---
title: Workflow Builder Platform
company: Deloitte
role: Tech Consultant → Tech Senior Consultant
dateRange: Apr 2021 – Jun 2023
tags: [Platform Engineering, Event-Driven Architecture, Modular Monolith, Tech Lead]
tldrProblem: A client's workflow landscape was split between bespoke apps with no reuse and a commercial builder too rigid to change — neither could keep up with evolving process requirements.
tldrDid: Designed a configurable workflow platform as modular monoliths, with a field catalogue, rule engine, dynamic form generator, and event-driven execution engine; led a cross-functional team that grew to 11.
tldrOutcome: **40%** reduction in workflow configuration time at rollout; processes previously locked behind months of change cycles took days.
---

## The Problem

Enterprise business processes are messy. They involve dozens of data points across different systems, rules that change depending on context, validation that varies by client or geography, and approvals that need to route differently depending on the values entered.

The client's existing landscape was split. Some processes were bespoke applications — built from scratch each time, same problems solved differently every time. Others ran on a commercial workflow builder that had become a bottleneck: changes that should have taken days were taking months, and adding a field or adjusting a routing rule often meant raising a ticket, waiting for an analyst, and navigating a tool that had grown too rigid for the pace the business needed.

Either way — custom app or commercial builder — the result was the same: no reuse, high friction to change, and delivery timelines that couldn't keep up with the rate at which process requirements evolved.

The ask: build a platform that made configurable, reusable workflows possible — without requiring developers to build from scratch every time, and without the rigidity of a tool that the business had already outgrown.

## What Was Built

The platform was delivered as a composition of **modular monoliths** in OutSystems, growing from a handful of modules to over 100 by the time I handed it over. The architecture wasn't fixed — components were given the structure that fit their stage, and boundaries shifted as the system's shape became clearer. The core design principle throughout was independent configurability at every layer.

### Field Catalogue

The foundation. A centralised registry of field definitions, each with a **type** (text, numeric, date, list, lookup, etc.) and associated metadata.

The interesting part was **field dependencies**: a field could declare that its list of valid values depended on the value of another field. For example, a "Municipality" field would show only municipalities belonging to the selected "District". These dependencies were modelled as a graph, and the catalogue could resolve the full dependency chain for any given field set — ensuring dependent fields were always fetched in the right order.

This made it possible for non-developers to define complex relational validation logic through configuration rather than code.

### Dynamic Form Generator

A form renderer that consumed field catalogue entries and translated them into UI components. Each field type had a registered renderer, and UI settings (label overrides, placeholder text, column layout, conditional visibility) were configurable per form instance.

Forms were not hard-coded screens. They were data — serialised configurations that could be versioned, cloned, and deployed without a code change.

### Rule Engine

The rule engine sat between data entry and process execution. It answered three questions:

- **Visibility**: should this field or section be shown, given the current form state?
- **Validation**: is this value valid, given the context (other field values, the user's role, the current step)?
- **Format**: does this value conform to the expected format (regex, range, enum membership)?

Rules were authored as structured configurations, not code. The engine evaluated them in a defined order, short-circuiting where possible, and returned a normalised result set the form could act on immediately.

The rule engine started as a module within the monolith — the right call for a component whose shape wasn't yet known. As the project matured and the engine's scope, complexity, and rate of independent change grew, it was extracted into its own microservice. That boundary wasn't imposed upfront; the component earned it over time. It's a small example of the broader philosophy: start with the simplest thing that makes sense, and let the architecture evolve when the evidence justifies it.

### Workflow Builder

The workflow builder allowed process owners to define **sequences of activities** — data collection steps, approvals, automated actions, and branch conditions — without writing code.

The execution engine used an **event-driven architecture**: activities were triggered by events — form submission, approval decision, timer — rather than polling. This made the platform resilient to long-running processes and naturally asynchronous. The implementation used OutSystems' Light BPT (Business Process Technology) as the underlying execution engine.

Multiple activity types were implemented: form steps, approval gates, notification triggers, integration calls, and conditional branches. Each type was independently configurable and new types could be added as isolated modules.

A workflow instance previewer was also built alongside the execution engine. For any running instance, it surfaced the full state: what had already executed, where the process currently stood, and what was coming next. In an async, event-driven system where a single workflow could span days or weeks, this gave process designers and end users the visibility they needed to understand and trust what the platform was doing — without having to dig into logs or ask a developer.

### Metric Inference

Because field definitions in the catalogue carried semantic type information, the platform could infer **aggregatable metrics** from collected values — without anyone explicitly saying "this is a KPI". If a field was typed as a numeric measure and appeared consistently across workflow instances, it was surfaced automatically in reporting views.

## My Role

This was my **first project as tech lead**, and also my first as team lead.

As tech lead I owned the architecture from the beginning: the decision to build as modular monoliths rather than a single application, the data model for field dependencies, the rule engine evaluation order, the module boundary strategy that kept the 100+ module system navigable, and the decision to extract the rule engine into a microservice as its lifecycle and complexity justified a stronger boundary.

As team lead I managed a team that grew from 3 to **11 direct reports at peak** — 2 business analysts, 8 developers (junior and mid), and 1 tester. I was responsible for sprint planning, code reviews, technical mentoring, and translating business requirements into implementation work.

One of the harder challenges was keeping the modular architecture intact as the team grew and delivery pressure increased. I introduced dependency guidelines and module ownership conventions that let multiple developers work on the platform simultaneously without creating coupling.

## Team & Collaboration

At peak, the delivery team was:

- **2 business analysts** — requirements, process mapping, client liaison
- **8 developers** — across frontend, backend, and integration layers
- **1 tester** — functional and regression
- **1 project manager** — timeline and stakeholder coordination

On the client side: a product owner, a scrum master, 1 business analyst, and 1 tester.

I reported directly to the project manager and was the primary technical point of contact for the client's product owner and IT team.

## Impact

- Eliminated per-project re-implementation of common field types and validation patterns
- Enabled non-technical process owners to modify form configurations and routing rules without raising a development ticket
- Reduced time to configure or modify a workflow by **40%** at rollout, measured against the previous platform's change cycle baseline. Processes previously locked behind months of change cycles were taking days. With growing component reuse, a further reduction to **70% was projected** as the reusable library matured — each new workflow built faster than the one before it
- The platform became the standard delivery vehicle for all new process digitisation work on the account

## What I'm Proud Of

**The field dependency model.** It sounds like a small feature — "fields can depend on other fields" — but getting the graph traversal right, handling circular dependency detection, and making it performant at runtime took real thought. When it clicked, it was one of those moments where the abstraction genuinely fit the problem.

**Keeping the architecture coherent at scale.** Going from 3 to 100+ modules with a growing team is the kind of situation where things usually turn into a ball of mud. The module boundary conventions we established held up. That's not luck — it was deliberate.

**The team.** Growing from "I need to produce output" to "I need to make 12 people effective" was a bigger transition than I expected. The most satisfying part wasn't the technical decisions — it was watching junior developers own features end-to-end by the end of the project.
