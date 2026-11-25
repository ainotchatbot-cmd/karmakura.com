# Security Specification — Phase 0 (Payload-First Security TDD)

## 1. Data Invariants
1. **Owner-Only Profile & Sanctuary Isolation**: No document under `/users/{userId}` (profile, `abbotThreads`, `messages`, or `savedReadings`) can be read, listed, created, updated, or deleted unless `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
2. **Master Gate on Subcollections**: An `AbbotMessage` under `/users/{userId}/abbotThreads/{threadId}/messages/{messageId}` cannot be read or created unless the parent `abbotThreads/{threadId}` document exists and its `ownerId` equals `request.auth.uid`.
3. **Immutable Ownership & Temporal Integrity**: `uid`, `ownerId`, `threadId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must strictly equal `request.time`.
4. **Volumetric & Key Whitelisting**: Every document enforces exact `hasAll` / `hasOnly` keys, valid regex IDs (`^[a-zA-Z0-9_\-]+$`, max 128 chars), strict string length limits, and enum constraints.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/users/u1` with `auth = null`.
2. **Unverified Email Spoof**: Write `/users/u1` with `auth = { uid: 'u1', token: { email_verified: false } }`.
3. **Cross-User Profile Hijack**: Write `/users/u2` as authenticated `u1`.
4. **Ghost Field / Shadow Update**: Create `/users/u1` including `{ isAdmin: true, role: 'super' }`.
5. **ID Poisoning**: Create thread at `/users/u1/abbotThreads/bad$id..1500chars` failing `isValidId()`.
6. **Fake Client Timestamp on Create**: Create `savedReadings/{id}` with client `createdAt: new Date(0)` instead of `serverTimestamp()`.
7. **Ownership Reassignment on Update**: Update `abbotThreads/{id}` changing `ownerId` from `u1` to `u2`.
8. **Immutable `createdAt` Tamper**: Update `/users/u1` modifying `createdAt`.
9. **Orphan Message Write**: Create message under non-existent `/users/u1/abbotThreads/missing/messages/m1`.
10. **Payload Exhaustion (Denial of Wallet)**: Create `AbbotMessage` with `text` > 4000 chars.
11. **Invalid Enum Injection**: Create `SavedReading` with `activeLens: 'invalid_lens'`.
12. **Blanket Collection Scraping**: List `/users` root collection or list `/users/u2/savedReadings` as `u1`.
