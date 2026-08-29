# ADR-004: Nginx reverse proxy

Status: accepted.

Nginx is selected over Traefik for a small, explicit route map, mature caching/header controls and a
straightforward production path. Dynamic container discovery is not needed in the modular-monolith
deployment shape.
