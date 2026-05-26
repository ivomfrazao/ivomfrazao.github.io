---
title: Deep-Linking Security Model
company: Fidelidade
role: Platform Software Engineer
dateRange: Jan 2026 – Present
tags: [Security, Authorization, JWT, Platform Engineering, Token Design]
tldrProblem: The platform's deep-linking had application-level isolation but no user-level check — anyone with a URL could arrive authenticated as the user it was created for, an impersonation path across ~20 production integrations.
tldrDid: Identified the gap proactively, designed a two-layer security model adding bearer token validation alongside the existing app-key mechanism, and extended the custom identity provider to support it.
tldrOutcome: User impersonation path closed across **~20** production integrations; rollout is incremental to allow consumers to migrate without a hard cutover.
---

## The Problem

The platform's deep-linking service allows applications to hand off a user to another application, carrying context — user identity, session state, the current flow — across the boundary.

The existing model already had application-level isolation in place. Each deeplink carried an ID in the URL; the corresponding secret key was sent server-side. The origin application declared the intended destination; the receiving application had to hold the matching key to read the context. An application could not consume a deeplink meant for a different application.

What the model did not have was a user-level check.

A deeplink created within User 1's authenticated session could be opened by User 2 — or by someone not logged in at all — and the context would be handed over regardless. The application-level gate checked which app was the intended recipient. It said nothing about which user.

This gap was exploitable. The platform's custom identity provider did not support single sign-on at the time. Teams had worked around this by passing the intended username inside the deeplink context, then using it on arrival to authenticate that user without requesting a password — effectively treating the deeplink as an SSO token. With no user-level check on the deeplink, anyone who obtained the URL could arrive at the destination application and be silently authenticated as the user it was created for.

## Identifying the Gap

I walked through the existing implementation and mapped what each layer of the model actually verified. The application-level isolation was real and correct — it worked as designed. The gap was orthogonal to it.

The missing check was not subtle. The service had no concept of a principal attached to a deeplink. If an authenticated session created one, that fact was not recorded. When a user arrived to consume it, nothing confirmed they were the same person. The context endpoint had no way to distinguish the intended recipient from anyone else with the URL.

Given how teams were using deeplinks — as an SSO substitute, carrying usernames that would authenticate silently on arrival — the missing check was a user impersonation path in production.

## The Fix

Bearer token validation was added as a second layer of the security model.

When a deeplink is created within an authenticated context, it is bound to the user's bearer token — issued by the platform's custom identity provider, scoped to the deeplink service as a resource server. To read the context, the caller must present that token alongside the existing application key. Without it, the context endpoint returns nothing — the context is unavailable, not unvalidated.

## The Two-Layer Model

The result is a two-layer structure:

**Layer 1 — App identity (existing):** The deeplink ID travels in the URL. The corresponding secret key is sent server-side. The origin application declares the intended destination; the receiving application must hold the matching key. A deeplink cannot be consumed by the wrong application.

**Layer 2 — User identity (added):** Deeplinks created in authenticated contexts are bound to a bearer token. The context endpoint requires that token to respond. A deeplink cannot be consumed by the wrong user.

Deeplinks created in unauthenticated contexts carry no bearer token and require none — the constraint applies only where a principal exists to constrain.

## Rollout

The service had ~20 integrations in production when the new model was introduced. A hard cutover was not feasible — teams needed time to update their implementations.

The rollout is incremental: the service supports both models in parallel during the transition period, with integrations migrating one by one.

## Connection to the Identity Provider Work

In parallel, I extended the platform's custom identity provider to align its OAuth2/OIDC authentication flows with Microsoft Entra External ID.

The connection between these two workstreams is direct, not just thematic. Making the bearer token requirement work required changes to the IdP itself: I introduced the audience concept to the tokens it generates, and registered the deeplink service as a resource server. The tokens the deeplink endpoint now validates are IdP-issued, audience-scoped to the deeplink service — the IdP extension was a prerequisite for the fix.

Beyond the mechanics, the absence of SSO in the custom IdP was the root cause of why teams were using deeplink context as an authentication substitute. The IdP work, by moving toward proper SSO support, addresses that underlying condition. The bearer token requirement closes the vulnerability SSO absence created. The two workstreams meet at both ends.

## What I'm Proud Of

**Identifying the gap proactively.** Before an incident surfaced it. The application-level isolation was intact and teams were not aware anything was missing — the vulnerability was in the combination of a legitimate workaround and an unchecked assumption the service made about who was on the other end.

**The fix is proportionate and specific.** It does not rebuild the model — it adds what was missing. The existing layer stays; the new layer closes a different boundary. That kind of surgical correctness is harder to achieve than a full replacement, and it is less likely to break things.
