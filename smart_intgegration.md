# Smart Engine Integration Guide (Redis Pub/Sub)

This guide is for the Smart Notification Engine team integrating with the backend.

## Overview

- Transport: Redis Pub/Sub
- Message encoding: JSON string (`JSON.stringify(payload)`)
- Current integration model:
  - Smart Engine -> Backend: publish notification commands
  - Backend -> Smart Engine: publish user behavior signals

## Channels

Defined in `src/common/constants/redis-pubsub.ts`.

- `smart.notifications.command.v1`
  - Direction: Smart Engine -> Backend
  - Purpose: command backend to send push notifications (with or without DB persistence)

- `smart.behavior.events.v1`
  - Direction: Backend -> Smart Engine
  - Purpose: send behavioral signals used for recommendation/decision learning

## Contract 1: Notification Command (Engine -> Backend)

Channel: `smart.notifications.command.v1`

### Payload schema

```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "title": "string",
  "body": "string",
  "type": "Message|New_post|Test|New_achievement|Reservation_alert",
  "save": true,
  "meta": {
    "any": "json object"
  }
}
```

### Field details

- `eventId` (required, UUID): unique event identifier for traceability
- `userId` (required, UUID): receiver user ID in backend
- `title` (required, string): notification title
- `body` (required, string): notification body
- `type` (required, enum): must be one of:
  - `Message`
  - `New_post`
  - `Test`
  - `New_achievement`
  - `Reservation_alert`
- `save` (required, boolean):
  - `true`: backend sends notification and persists record
  - `false`: backend sends notification only (no DB notification record)
- `meta` (optional, object): JSON object attached as notification metadata. When `meta.action` is present, the backend validates that required fields for that action are included (see **Meta action contract** below). If validation fails, the message is rejected.

### Meta action contract

When `meta.action` is set, the backend validates that the required fields for that action are present. If any required field is missing, the message is rejected with an error.

| `meta.action`       | Required fields                                  | Optional fields                                                          |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `chat.open`          | `chatId`, `conversationId`, `messageId`, `senderId` | `senderName`, `senderAvatarUrl`                                       |
| `donation.open`      | `donationId`                                     | `donationTitle`, `donationImageUrl`, `donorId`                          |
| `reservation.open`   | `reservationId`, `donationId`, `status`         | `beneficiaryName`, `donationTitle`, `donationImageUrl`, `senderAvatarUrl`, `quantity` |
| `report.open`        | `reportId`, `targetType`, `targetId`            | `status`                                                                 |
| `account.open`       | `userId`, `status`                               | —                                                                        |
| `achievement.open`   | `achievementId`, `badgeCode`                    | —                                                                        |
| `post.open`          | `postId`                                         | `commentId`, `authorId`                                                  |
| `message.open`       | `threadId` **or** `senderId` (at least one)     | —                                                                        |
| `notification.open`  | —                                                | —                                                                        |

If `meta.action` is not set or is not a recognized action, it defaults to `notification.open` (no required fields).

#### Example: `post.open`

```json
{
  "eventId": "6e57ce83-c965-4b4f-bc2b-3341f9409c6d",
  "userId": "68a9c74f-53fb-45d7-b9f8-f8e1833737d8",
  "title": "New comment on your post",
  "body": "John commented: Great donation!",
  "type": "New_post",
  "save": true,
  "meta": {
    "action": "post.open",
    "postId": "dbe6f4ce-172f-4e91-9930-3dcc5f334f0f",
    "commentId": "a1b2c3d4-5678-9012-abcd-ef0123456789",
    "authorId": "12345678-1234-1234-1234-123456789012"
  }
}
```

### Validation and sanitization behavior

Backend validates using class-validator (`validateSync`) and rejects malformed messages.

- Unknown fields are rejected.
- `title` and `body` are sanitized before sending:
  - strips HTML tags
  - removes control characters
  - normalizes whitespace
  - truncates max length
    - title: 120 chars
    - body: 800 chars
- If payload is invalid, backend ignores the message and logs a warning with safe metadata (hash/size), not full raw content.

### Expected side effect

On valid command:

- Backend enqueues an async notification job.
- Delivery to user devices uses existing FCM token pipeline.
- For `save=true`, a notification record is persisted.

### Publish example

```ts
await redis.publish(
  'smart.notifications.command.v1',
  JSON.stringify({
    eventId: '6e57ce83-c965-4b4f-bc2b-3341f9409c6d',
    userId: '68a9c74f-53fb-45d7-b9f8-f8e1833737d8',
    title: 'New nearby donation',
    body: 'Fresh fruits available 500m from your location.',
    type: 'Message',
    save: true,
    meta: {
      donationId: 'dbe6f4ce-172f-4e91-9930-3dcc5f334f0f',
      distance: '500m',
    },
  }),
);
```

## Contract 2: Beneficiary Search Behavior (Backend -> Engine)

Channel: `smart.behavior.events.v1`

Published when beneficiary search intent is detected from donation listing query context.

### Payload schema

```json
{
  "eventId": "uuid",
  "timestamp": "ISO-8601",
  "eventName": "BeneficiarySearchPerformed",
  "userId": "uuid",
  "categoryId": "uuid",
  "urgency": "Low|Medium|High",
  "distanceBucket": "500m|1km|5km",
  "origin": "map|list"
}
```

### Notes

- Optional fields may be omitted if unknown/not provided.
- Event emitted best-effort; user flow does not fail if publish fails.

## Contract 3: Donation Published Behavior (Backend -> Engine)

Channel: `smart.behavior.events.v1`

Published after successful donation creation.

### Payload schema

```json
{
  "eventId": "uuid",
  "timestamp": "ISO-8601",
  "eventName": "DonationPublished",
  "donorId": "uuid",
  "donationId": "uuid",
  "categoryId": "uuid",
  "urgency": "Low|Medium|High",
  "safetyChecklistCompleted": true
}
```

## GraphQL integration note (for clients feeding backend)

Backend donation listing query supports:

- `filter`: true donation filtering (`categoryId`, `urgency`, `status`)
- `behaviorContext`: smart-learning context (`distanceBucket`, `origin`)

Behavior context is used for learning signal publication, not DB filtering.

## Reliability characteristics

Redis Pub/Sub semantics apply:

- No persistence/replay
- No delivery acknowledgments
- At-most-once behavior in failure/disconnect scenarios

If strict durability is required later, migration to Redis Streams can be done with minimal contract changes.

## Versioning guidance

- Channel names use `.v1` suffix.
- Any breaking payload change should use new channel version (`.v2`) and dual-run during migration.

## Quick checklist for Smart Engine team

- Publish valid JSON objects only.
- Use UUIDs for `eventId` and user identifiers.
- Use only allowed notification `type` enum values.
- Send `save=true/false` explicitly.
- Do not include unknown top-level keys (backend rejects them).
- When including `meta.action`, ensure all required fields for that action are present (see **Meta action contract** above).
- Subscribe to `smart.behavior.events.v1` for learning events.
