# ADR-002: Meilisearch

Status: accepted.

Meilisearch provides typo tolerance, facets, filters and approachable operations for the initial team.
Turkish relevance will be evaluated with a curated query set and explicit synonyms; PostgreSQL remains
authoritative. Index versioning and rebuild jobs keep replacement with Typesense/OpenSearch possible.
