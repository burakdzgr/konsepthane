# ADR-003: BullMQ before RabbitMQ

Status: accepted.

BullMQ on the required Redis instance handles owned background work with retries and observability.
RabbitMQ is deferred because no cross-service integration currently requires a broker. Domain events
pass through a queue port so a transactional outbox and RabbitMQ can be introduced when independent
services or delivery guarantees justify the operational cost.
