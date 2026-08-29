# ADR-001: Modular monolith

Status: accepted.

One NestJS deployment owns transactional domains. Modules expose application services and events,
not tables. This minimizes operational cost and preserves strong transactions while leaving natural
extraction seams if scale, team ownership or isolation later justifies a service boundary.
