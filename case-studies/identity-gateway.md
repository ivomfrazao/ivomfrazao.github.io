---
title: Identity Gateway
role: Platform Software Engineer
dateRange: Apr 2026 – Present
tags: [OAuth2/OIDC, JWKS, Microsoft Entra, Session Security, Platform Engineering]
published: 2026-09-08
description: Identity gateway bringing PKCE, nonce and JWKS-based JWT validation to applications through configuration, with no code changes on their side.
diagram: diagrams/identity-gateway.svg
diagramTitle: Identity gateway architecture
diagramCaption: Applications call the gateway's stable API. The gateway runs the OAuth2/OIDC flow against the identity provider and validates tokens with keys from its JWKS endpoint. On logout, the identity provider's callback makes the gateway invalidate the session server-side.
tldrProblem: Every application ran its own OAuth2/OIDC client against a custom identity provider, and implementations were inconsistent across teams. Signature validation relied on distributed static certificates, which made key rotation impractical.
tldrDid: Added PKCE, nonce, a JWKS endpoint, session-scoped tokens and front-channel logout to the identity provider, then designed and built an identity gateway that applies them, with correct JWT validation, to any application integrated through it, with no code changes on that application's side.
tldrOutcome: Applications integrated through the gateway get PKCE, nonce and correct JWT validation without code changes. Logout is enforced server-side, which sidesteps browser limits on front-channel logout. A future migration to Microsoft Entra External ID needs configuration changes only for applications behind the gateway.
---

## The Problem

The platform runs a custom customer identity provider, built in-house. It authenticates users across the platform's applications. Every OutSystems application that needed authentication talked to it directly, and each team was responsible for its own OAuth2/OIDC client code.

OIDC client implementations were inconsistent across teams. Getting OAuth2 right while also shipping features is a specialised skill, and generalist application teams weren't set up to maintain it.

Signature validation relied on distributed static certificates rather than keys fetched dynamically, which made key rotation impractical. The identity provider also lacked a shared sign-out: ending a session in one application did nothing to sessions the same user held open in others.

## Building the Missing IdP Capabilities

I added PKCE code challenge verification and nonce to the identity provider's authorization code flow.

I also added a session identifier and an issuer claim to the tokens the identity provider mints, and built a JWKS endpoint so relying parties can fetch the current signing key by its key ID. The JWKS endpoint makes key rotation possible.

I built a shared sign-out mechanism from scratch, implemented as front-channel logout, matching the pattern Entra External ID uses: on logout, the identity provider notifies every relying party of the session end through a browser-mediated call, so each application can clear its own session state. Matching Entra's pattern here was deliberate. Anything built to align with how the eventual migration target already behaves is one less thing to redesign when that migration happens.

## The Front-Channel Logout Problem

Front-channel logout depends on the browser letting the identity provider's page reach into each relying party's storage and cookies, across domains, to clear them. Modern browsers increasingly restrict that. Third-party storage partitioning and cookie restrictions, the same category of protection as Safari's Intelligent Tracking Prevention, are designed specifically to stop cross-domain scripts from touching another origin's client-side state. A front-channel logout call looks, to the browser, indistinguishable from the tracking behaviour those protections exist to block.

The practical effect: the logout call fires, but in browsers that enforce these restrictions, the receiving application can't act on it. The session looks ended from the identity provider's side. Remnants of it can still sit in the browser's storage, in state the application was never given permission to clear.

This is not a bug in any one implementation. It is a structural conflict between a protocol pattern designed years ago and browser privacy models that have since moved on. Fighting it on the client side means fighting the browser vendors' security roadmap, which is not a fight worth having.

## The Identity Gateway

None of the new IdP capabilities needed a gateway to work. Single sign-on, single sign-out, PKCE, nonce, and JWKS-based validation are all things the identity provider now supports directly, and any application that implements the OAuth2/OIDC flow correctly against it gets them, gateway or not.

Implementing that flow correctly is the hard part, and it is where inconsistency creeps in. Adopting the new capabilities without a gateway would still have meant every team updating its own OAuth2 client to send a code challenge, check a nonce, fetch the right key from the JWKS endpoint, and handle a front-channel logout call. That is one implementation per team, each a separate chance to get it wrong, the same pattern that produced inconsistent client implementations in the first place.

That fragmentation risk does not end once these particular gaps are closed. The next security requirement, the next protocol update, the next capability the identity provider gains, would hit the same wall again unless the integration point itself was built to change without dragging every application along with it.

So I proposed, designed and built an identity gateway: a single piece of software with a stable, simple API that gives every application the identity provider's capabilities correctly, without each team having to build and maintain its own OAuth2/OIDC client. The gateway does what each application used to do for itself.

**Secure token storage.** Access and refresh tokens are held by the gateway and stored according to security practices maintained centrally by the team responsible for that problem.

**Redirect-context storage.** The state that has to survive an OAuth2 redirect round trip is centralized rather than reinvented per application.

**Protocol compliance.** Any application that integrates through the gateway gets PKCE, nonce, JWKS-based signature validation, single sign-on, and single sign-out without changing its own code. The gateway speaks the protocol on the application's behalf, correctly, once.

**Correct JWT validation.** Signature and claims validation against keys fetched dynamically from the JWKS endpoint now lives in one place, built and maintained by the platform team, and applies uniformly to everything routed through the gateway.

**Independent evolution.** The gateway is built as a microservice, exposed through OutSystems' built-in service action capabilities. New capabilities can be added on the gateway side without any integrated application changing its own code, unless the change requires a new API version.

The gateway also changes the shape of the eventual Entra External ID migration. For applications integrated through it, that migration becomes a configuration change at the gateway, pointing it at a different identity provider, rather than a development effort repeated across every team that has to touch its own OAuth2 client. That was a deliberate design goal, not a side effect.

## Fixing the Browser Restriction

The fix for the browser restriction is the session identifier added to minted tokens as part of this project. Invalidate it server-side on logout, and it no longer matters that the browser won't let a cross-domain script clear cookies or storage. The session that identifier points to no longer exists on the server that would honour it, whatever is still sitting in the browser's storage. Any application checking that identifier against the identity provider gets this without needing the browser's cooperation at all.

For applications integrated through the gateway, that check is automatic. The logout callback hits the gateway, which invalidates the session identifier server-side, so an application holding on to unclearable client-side session remnants can no longer use them, because the gateway has already killed the thing they authenticate against. It is one more capability the identity provider makes possible, and the gateway makes it available to every integrated application without any code change on their side.

The browser restriction was never going to be solved by working around it on the browser's own terms. It was solved by moving the fix to the server, where the browser has no say.

## Keeping the Front End Honest

Server-side invalidation closes the security gap, but a user sitting in an application with a dead session doesn't know it until they try to do something that fails. I built a front-end widget for OutSystems applications that surfaces a session killed elsewhere, so it doesn't go unnoticed.

## Rewriting Token Minting

Alongside this work, I rewrote the Authorization Code, Refresh Token, and Access Token minting logic in the identity provider. The rewrite addressed performance and security concerns found while working through the rest of this project, the kind that surface once someone reads token-minting code end-to-end instead of treating it as settled infrastructure.

It also added retention purge jobs for token-related tables and brought indexing across them to a consistent standard, giving the identity provider a clean baseline under sustained load.

## What It Gives Applications

The identity provider capabilities, PKCE, nonce, the JWKS endpoint, session-scoped tokens, single sign-on, and front-channel logout, are available to any application that implements the OAuth2/OIDC flow against them correctly. Applications integrated through the gateway get PKCE, nonce, and correct JWT validation without touching their own code.

## Connection to the Deep-Linking Security Work

This work is the direct root cause of the [Deep-Linking Security Model](deeplink-security.html) case study, not just a related topic.

Some integrations relied on deeplink context for cross-application sign-in, which made a user-level check essential. That is what the deep-linking case study is about: I closed that gap by adding bearer token validation to the deeplink service.

Single sign-on, now built into the identity provider, is what removes the need for that pattern. Any application that implements the OAuth2/OIDC flow correctly against it gets a user recognized across applications without a fresh login, and that did not require the gateway to exist. What the gateway adds is the same thing it adds everywhere else: a single, stable, simple API so an application gets that behaviour correctly without building and maintaining its own OAuth2/OIDC client.

Making the bearer token fix work also required a separate change to the identity provider. I introduced an audience concept to the tokens it issues and registered the deep-linking service as a resource server, both done as part of this project. The token-minting rewrite is what those audience-scoped tokens run through today.

The deep-linking fix closed the user-level gap. This project addresses the need behind it.

## What I'm Proud Of

**Solving the browser restriction by not fighting it.** Front-channel logout being undermined by browser privacy protections is a known, structural problem, not something specific to this platform. The fix was not a cleverer client-side workaround. It was recognising that the client side was the wrong place to look, and moving the actual invalidation somewhere the browser has no say over.

**Turning fragmentation into leverage.** Every team maintaining its own OAuth2 client and JWT validation was not just an inconsistency, it was a place every future change would have to touch. The gateway collapses that into one component, and every application integrated through it is protected without touching its own code. That is the kind of fix that pays for itself twice.
