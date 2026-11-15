---
title: Deep-Linking Security Model
company: Fidelidade
role: Platform Software Engineer
dateRange: Jan 2026 – Present
tags: [Security, Authorization, JWT, Platform Engineering, Token Design]
published: 2026-05-22
description: Bearer token validation added to deep-linking to close a user impersonation path across multiple integrations, without a hard cutover.
diagram: diagrams/deeplink-security.svg
diagramTitle: Deeplink security model
diagramCaption: A deeplink is bound to the creating user's bearer token. The deeplink service returns context only when the caller presents both the application key and a token scoped to the service.
tldrProblem: The platform's deep-linking had application-level isolation but no user-level check. Teams used deeplink context as an SSO substitute, so anyone with a URL could arrive authenticated as the user it was created for.
tldrDid: Identified the gap proactively, designed a two-layer security model adding bearer token validation alongside the existing app-key mechanism, and extended the custom identity provider to issue audience-scoped tokens for it.
tldrOutcome: The user impersonation path was closed for **multiple integrations**, and the service supported both models in parallel so consumers could migrate without a hard cutover.
---

## The Problem

The platform's deep-linking service allowed applications to hand off a user to another application, carrying context, such as user identity, session state, and the current flow, across the boundary.

The existing model already had application-level isolation in place. Each deeplink carried an ID in the URL; the corresponding secret key was sent server-side. The origin application declared the intended destination; the receiving application had to hold the matching key to read the context. An application could not consume a deeplink meant for a different application.

What the model did not have was a user-level check.

A deeplink created within User 1's authenticated session could be opened by User 2, or by someone not logged in at all, and the context would be handed over regardless. The application-level gate checked which app was the intended recipient. It said nothing about which user.

This gap was exploitable. The platform's custom identity provider did not support single sign-on at the time. Teams had worked around this by passing the intended username inside the deeplink context, then using it on arrival to authenticate that user without requesting a password, effectively treating the deeplink as an SSO token. With no user-level check on the deeplink, anyone who obtained the URL could arrive at the destination application and be silently authenticated as the user it was created for.

## Identifying the Gap

I walked through the existing implementation and mapped what each layer of the model actually verified. The application-level isolation was real and correct: it worked as designed. The gap was orthogonal to it.

The missing check was not subtle. The service had no concept of a principal attached to a deeplink. If an authenticated session created one, that fact was not recorded. When a user arrived to consume it, nothing confirmed they were the same person. The context endpoint had no way to distinguish the intended recipient from anyone else with the URL.

Given how teams were using deeplinks, as an SSO substitute, carrying usernames that would authenticate silently on arrival, the missing check was a user impersonation path in production.

## The Fix

Bearer token validation was added as a second layer of the security model.

When a deeplink was created within an authenticated context, it was bound to the user's bearer token, issued by the platform's custom identity provider and scoped to the deeplink service as a resource server. To read the context, the caller had to present that token alongside the existing application key. Without it, the context endpoint returned nothing: the context was unavailable, not unvalidated.

## The Two-Layer Model

The result is a two-layer structure:

**Layer 1, App identity (existing):** The deeplink ID travels in the URL. The corresponding secret key is sent server-side. The origin application declares the intended destination; the receiving application must hold the matching key. A deeplink cannot be consumed by the wrong application.

**Layer 2, User identity (added):** Deeplinks created in authenticated contexts are bound to a bearer token. The context endpoint requires that token to respond. A deeplink cannot be consumed by the wrong user.

Deeplinks created in unauthenticated contexts carry no bearer token and require none: the constraint applies only where a principal exists to constrain.

## Migration

Several integrations had registered on the deeplink service, and a number of them used deeplink context as an SSO substitute. A hard cutover was not feasible for those: teams needed time to update their implementations.

The service supported both models in parallel during the transition, so integrations could migrate one by one.

## Connection to the Identity Gateway Work

Alongside this work, I extended the platform's custom identity provider to align its OAuth2/OIDC authentication flows with Microsoft Entra External ID, and proposed, designed and built an [identity gateway](identity-gateway.html) that gives every application a stable, simple way to use those flows correctly. That project is covered in its own case study.

The connection between these two workstreams is direct, not just thematic. Making the bearer token requirement work required changes to the IdP itself. I introduced the audience concept to the tokens it generates, and registered the deeplink service as a resource server. The tokens the deeplink endpoint now validates are IdP-issued, audience-scoped to the deeplink service. The IdP extension was a prerequisite for the fix.

Beyond the mechanics, the absence of single sign-on in the custom IdP was the root cause of why teams were using deeplink context as an authentication substitute in the first place. Single sign-on now exists at the identity provider itself, which closes that gap directly: a user already signed in through one application is recognized by another without a fresh login, no deeplink required. The identity gateway does not create that capability, but it is what will let every application rely on it without building its own OAuth2/OIDC client, as gateway adoption grows beyond the pilot it is in today. The bearer token requirement closes the vulnerability the workaround had created in the meantime. The two workstreams close the same root cause from opposite ends.

## What I'm Proud Of

**Identifying the gap proactively.** Before an incident surfaced it. The application-level isolation was intact and teams were not aware anything was missing: the vulnerability was in the combination of a legitimate workaround and an unchecked assumption the service made about who was on the other end.

**The fix is proportionate and specific.** It does not rebuild the model; it adds what was missing. The existing layer stays; the new layer closes a different boundary. That kind of surgical correctness is harder to achieve than a full replacement, and it is less likely to break things.
