---
title: Identity Gateway
company: Fidelidade
role: Platform Software Engineer
dateRange: Apr 2026 – Present
tags: [OAuth2/OIDC, JWKS, Microsoft Entra, Session Security, Platform Engineering]
tldrProblem: A review of the platform's highest-usage OutSystems applications found none with complete JWT validation, and inconsistent, often undisciplined, token persistence. Validation gaps included inconsistent lifetime, issuer, and audience checks, no nonce support anywhere, and signature checks against a static certificate per team instead of a JWKS endpoint, which meant the signing key had never been rotated.
tldrDid: Added the missing IdP capabilities (PKCE, nonce, a JWKS endpoint, session-scoped tokens, and front-channel logout, all new to the identity provider), then proposed, designed and built an identity gateway that applies those capabilities and correct JWT validation to any application that moves onto it, with no code changes on that application's side. Also rewrote token minting end-to-end.
tldrOutcome: The gateway is in pilot with the platform's first 5 applications; PKCE, nonce, and correct JWT validation apply to them without any code changes on their side. Wider rollout across the identity provider's other development teams depends on the pilot's outcome. A future migration to Microsoft Entra External ID will need configuration changes only for applications integrated through the gateway.
---

## The Problem

Fidelidade's platform runs a custom identity provider, built in-house before Microsoft Entra External ID was adopted as the organisation's long-term direction. Every OutSystems application that needed authentication talked to it directly, and each team was responsible for its own OAuth2/OIDC client code.

I reviewed a sample of the platform's highest-usage applications, and in practice, none of them were persisting tokens with any real discipline. Most weren't keeping access and refresh tokens around in a considered way at all. The few that did store them did it poorly. None of this had been flagged as a risk to product owners before I looked at it end to end.

JWT validation existed per team, but it had real gaps, and they varied by team. None of the applications in the sample had complete validation: some didn't check a token's lifetime, some didn't check its issuer, some didn't check its audience. None of this was because anyone was negligent. Getting OAuth2 right while also shipping features is a specialised skill, and generalist application teams weren't set up to maintain it.

Two things were missing at the protocol level, not just inconsistently applied per team. Nonce validation did not exist anywhere on the platform: the identity provider had never implemented it, so there was nothing for any team to check. And signature validation was done against a static certificate each team held locally, rather than fetched dynamically from a JWKS endpoint keyed by the signing key's ID, because no such endpoint existed. That meant rotating the signing key would have broken every team's hardcoded copy at once. The key had never been rotated.

The identity provider also had no shared sign-out. Ending a session in one application did nothing to sessions the same user held open in others.

## Building the Missing IdP Capabilities

I added PKCE code challenge verification and nonce to the identity provider's authorization code flow. Neither had existed before.

I also added a session identifier and a usable issuer claim to the tokens the identity provider mints, and built a JWKS endpoint so relying parties can fetch the current signing key by its key ID instead of holding a static copy. That endpoint is what makes key rotation possible for the first time. Before it existed, rotating the key meant breaking every team's hardcoded certificate at once, which is why it had never been done.

The identity provider had no shared sign-out mechanism of any kind. I built one from scratch, implemented as front-channel logout, matching the pattern Entra External ID uses: on logout, the identity provider notifies every relying party of the session end through a browser-mediated call, so each application can clear its own session state. Matching Entra's pattern here was deliberate. Anything built to align with how the eventual migration target already behaves is one less thing to redesign when that migration happens.

## The Front-Channel Logout Problem

Front-channel logout depends on the browser letting the identity provider's page reach into each relying party's storage and cookies, across domains, to clear them. Modern browsers increasingly restrict that. Third-party storage partitioning and cookie restrictions, the same category of protection as Safari's Intelligent Tracking Prevention, are designed specifically to stop cross-domain scripts from touching another origin's client-side state. A front-channel logout call looks, to the browser, indistinguishable from the tracking behaviour those protections exist to block.

The practical effect: the logout call fires, but in browsers that enforce these restrictions, the receiving application can't act on it. The session looks ended from the identity provider's side. Remnants of it can still sit in the browser's storage, in state the application was never given permission to clear.

This is not a bug in any one implementation. It is a structural conflict between a protocol pattern designed years ago and browser privacy models that have since moved on. Fighting it on the client side means fighting the browser vendors' security roadmap, which is not a fight worth having.

## The Identity Gateway

None of the new IdP capabilities needed a gateway to work. Single sign-on, single sign-out, PKCE, nonce, and JWKS-based validation are all things the identity provider now supports directly, and any application that implements the OAuth2/OIDC flow correctly against it gets them, gateway or not.

Implementing that flow correctly is the hard part, and it is exactly what had gone wrong before. Adopting the new capabilities without a gateway would still have meant every team updating its own OAuth2 client to send a code challenge, check a nonce, fetch the right key from the JWKS endpoint, and handle a front-channel logout call. That is 15 teams, 15 separate implementations, 15 separate chances to get it wrong again, the same pattern that produced the token storage and JWT validation problems in the first place.

That fragmentation risk does not end once these particular gaps are closed. The next security requirement, the next protocol update, the next capability the identity provider gains, would hit the same wall again unless the integration point itself was built to change without dragging every application along with it.

So I proposed, designed and built an identity gateway: a single piece of software with a stable, simple API that gives every application the identity provider's capabilities correctly, without each team having to build and maintain its own OAuth2/OIDC client. The gateway does what each application used to do for itself.

**Secure token storage.** Access and refresh tokens are held by the gateway and stored according to security practices maintained by a team dedicated to that problem, rather than left to each application's generalist web developers.

**Redirect-context storage.** The state that has to survive an OAuth2 redirect round trip is centralized rather than reinvented per application.

**Protocol compliance.** Any application that integrates through the gateway gets PKCE, nonce, JWKS-based signature validation, single sign-on, and single sign-out without changing its own code. The gateway speaks the protocol on the application's behalf, correctly, once.

**Correct JWT validation.** The validation logic individual teams were getting wrong, including checking lifetime, issuer, and audience against keys fetched dynamically from the JWKS endpoint, now lives in one place, built and maintained by the platform team, and applies uniformly to everything routed through the gateway.

**Independent evolution.** The gateway is built as a microservice, exposed through OutSystems' built-in service action capabilities. New capabilities can be added on the gateway side without any integrated application changing its own code, unless the change requires a new API version.

The gateway also changes the shape of the eventual Entra External ID migration. For applications integrated through it, that migration becomes a configuration change at the gateway, pointing it at a different identity provider, rather than a development effort repeated across every team that has to touch its own OAuth2 client. That was a deliberate design goal, not a side effect.

## Fixing the Browser Restriction

The fix for the browser restriction is the session identifier added to minted tokens as part of this project. Invalidate it server-side on logout, and it no longer matters that the browser won't let a cross-domain script clear cookies or storage. The session that identifier points to no longer exists on the server that would honour it, whatever is still sitting in the browser's storage. Any application checking that identifier against the identity provider gets this without needing the browser's cooperation at all.

For applications integrated through the gateway, that check is automatic. The logout callback hits the gateway, which invalidates the session identifier server-side, so an application holding on to unclearable client-side session remnants can no longer use them, because the gateway has already killed the thing they authenticate against. It is one more capability the identity provider makes possible, and the gateway makes it available to every integrated application without any code change on their side.

The browser restriction was never going to be solved by working around it on the browser's own terms. It was solved by moving the fix to the server, where the browser has no say.

## Keeping the Front End Honest

Server-side invalidation closes the security gap, but a user sitting in an application with a dead session doesn't know it until they try to do something that fails. I built a front-end widget for OutSystems applications that checks current session validity on user interaction, so a session killed elsewhere surfaces quickly instead of silently.

Checking on every interaction would mean a validation call per click, which doesn't scale. The widget uses a local timeout: it checks on interaction, then suppresses further checks for a short window, trading a small amount of staleness for a large reduction in call volume.

## Rewriting Token Minting

Alongside this work, I rewrote the Authorization Code, Refresh Token, and Access Token minting logic in the identity provider. The rewrite addressed several performance and security issues uncovered while working through the rest of this project, the kind of issues that surface once someone reads token-minting code end-to-end looking for problems instead of treating it as settled infrastructure.

Because the identity provider sits underneath every application on the platform, this was not a change I could cut over in one release. It rolled out progressively, per application, so any regression would surface against a small blast radius rather than the whole platform at once.

## Where This Stands

The IdP capabilities, PKCE, nonce, the JWKS endpoint, session-scoped tokens, single sign-on, and front-channel logout, are in production and available to the whole platform to any application that implements the OAuth2/OIDC flow against them correctly. The gateway itself is in pilot with the platform's first 5 applications. Those applications get PKCE, nonce, and correct JWT validation without having touched their own code. Whether the gateway extends to the identity provider's other development teams depends on how that pilot goes.

## Connection to the Deep-Linking Security Work

This work is the direct root cause of the [Deep-Linking Security Model](deeplink-security.html) case study, not just a related topic.

The custom identity provider had no single sign-on. Teams responded by passing a username through deeplink context and authenticating on arrival without a password, using the deeplink itself as a substitute for a real cross-application session. That workaround is what the deep-linking case study is about: it left no check on who was allowed to consume a given deeplink, and it became a user impersonation path that I closed by adding bearer token validation to the deeplink service.

What actually removes the reason the workaround existed is single sign-on itself, now built into the identity provider. Any application that implements the OAuth2/OIDC flow correctly against it gets a user recognized across applications without a fresh login, and that did not require the gateway to exist. What the gateway adds is the same thing it adds everywhere else: a single, stable, simple API so an application gets that behaviour correctly without building and maintaining its own OAuth2/OIDC client, the same complexity that produced the token storage and JWT validation problems in the first place. As gateway adoption grows, fewer applications carry that risk, and the deeplink-based substitute has less reason to exist anywhere on the platform.

Making the bearer token fix work also required a separate change to the identity provider. I introduced an audience concept to the tokens it issues and registered the deep-linking service as a resource server, both done as part of this project. The token-minting rewrite is what those audience-scoped tokens run through today.

The deep-linking fix closed the vulnerability the workaround had created. This project closes the gap that made the workaround necessary in the first place.

## What I'm Proud Of

**Solving the browser restriction by not fighting it.** Front-channel logout being undermined by browser privacy protections is a known, structural problem, not something specific to this platform. The fix was not a cleverer client-side workaround. It was recognising that the client side was the wrong place to look, and moving the actual invalidation somewhere the browser has no say over.

**Turning fragmentation into leverage.** Fifteen teams each maintaining their own OAuth2 client and JWT validation was not just a security inconsistency, it was fifteen places a future migration would have to touch. The gateway collapses that into one component, and every application that moves onto it is protected without touching its own code. That is the kind of fix that pays for itself twice.
