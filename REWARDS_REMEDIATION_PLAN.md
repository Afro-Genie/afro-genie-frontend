# Token & Badge Reward System — Remediation Plan

## Role-Based Reward Analysis

### Reward Flows Per Role

```
ROLE: USER (ordinary user — default role)
├── Translation contributions
│   ├── Approve translation       → +10 tokens   (async via BullMQ queue)
│   ├── Translation upvoted       → +2 tokens    (async via BullMQ queue)
│   ├── Request fulfilled         → +5 tokens    (async via BullMQ queue)
│   └── Badges: EARLY_ADOPTER, TOP_TRANSLATOR, CULTURE_CURATOR
├── Community contributions
│   ├── Create topic              → +5 tokens    (async via BullMQ queue)
│   ├── Create comment            → +2 tokens    (async via BullMQ queue)
│   └── Badges: COMMUNITY_HELPER, FIRST_PROFILE
├── Store purchases
│   └── Badge: GENEROUS_SUPPORTER (≥3 purchases)
├── Referrals
│   ├── Referrer                  → +20 tokens   (SYNC — NOT through queue ❌)
│   ├── New user                  → +10 tokens   (SYNC — NOT through queue ❌)
│   └── Badge: REFERRAL_STAR (≥3 referrals)
└── Voting
    └── No rewards for casting votes; only translation authors get +2 for upvotes received

ROLE: ARTIST (same flows as USER, plus:)
├── All USER rewards apply (artists are a superset of users)
├── Artist-specific features (no token rewards)
│   ├── Song/release management
│   ├── Analytics dashboard
│   └── Badge: ARTIST_SPOTLIGHT (verified artist)
└── ❌ No artist-specific reward multipliers or special reward triggers

ROLE: MODERATOR (same flows as USER, plus:)
├── All USER rewards apply
├── Moderation actions (no token rewards ❌)
│   ├── Pin/lock topics
│   ├── Delete/update topics
│   ├── Manage categories
│   └── Moderate comments
├── ❌ No badges for moderation contributions
└── ❌ No report/flag system (defined in schema as MODERATION notification type,
       but no routes implemented)

ROLE: ADMIN
├── Manual token adjustment (+/- 1000)     (direct creditTokens — NOT through queue ❌)
├── Badge revocation
├── User role management
├── Artist verification/suspension
└── No automated rewards (by design — admins can self-award)
```

---

### Voting System — Entity Map

| Entity Voted On | Endpoint | Who Can Vote | Reward for Author? | Reward for Voter? |
|---|---|---|---|---|
| **Translation** | `POST /translations/:id/vote` | Any auth user | +2 tokens (if UPVOTE received) | ❌ |
| **Topic** | `POST /community/vote/topic` | Any auth user | ❌ | ❌ |
| **Comment** | `POST /community/vote/comment` | Any auth user | ❌ | ❌ |

Only **translation upvoting** triggers a token reward — and only for the *translation author*, not the voter. Topic and comment voting earn nothing for either party.

---

### Key Architecture Insight: Translation Auto-Approval

Translations are **auto-approved** in every code path (`translationJob.ts` always upserts with `status: 'APPROVED'`). There is:

- No manual review step before approval
- No moderation queue for pending translations
- No endpoint to set `REJECTED` status (it exists in the schema enum but is never used)
- `TranslationCorrection` model exists but has no admin approve/reject endpoint

This means the **original requester ≠ translator** problem exists: when a user requests translation of song X, and a *different user*'s existing approved translation is returned, the reward goes to the translation's author via the original `processTranslationJob` flow. But when `checkExisting` returns the cached APPROVED translation in the request route directly (without running `processTranslationJob`), **no reward is issued at all** for that path — which is correct since the reward was already issued when the translation was first created.

---

### The MODERATOR Role Gap

The `MODERATOR` role exists in `UserRole` enum and is checked in community routes (`requireRole('MODERATOR', 'ADMIN')` for pin/lock/delete), but:

1. **No reward triggers for moderation actions** — moderators do unpaid community management work with zero token/badge recognition
2. **No moderation-specific badge** — no badge like "COMMUNITY_GUARDIAN" or "TRUSTED_MODERATOR"
3. **No report/flag system** — the schema has `MODERATION` in `NotificationType` enum but no report model, no flag endpoint, no review queue
4. **TranslationCorrection review** — corrections can be submitted (`POST /translations/:id/correction`) but there's no admin/moderator endpoint to approve or reject them, making the feature dead
5. **REJECTED status** — translations can never be marked REJECTED, meaning moderators have no way to reject inappropriate content

This is a **major implementation gap** that undermines the MODERATOR role entirely.

---

## Phased Remediation Plan

### Phase 1 — Critical Data Integrity Fixes

| # | Gap | Step | Files |
|---|---|---|---|
| 1 | **Duplicate badge race condition** | Add `@@unique([userId, badgeType])` to `UserBadge` model; run migration | `prisma/schema.prisma`, migration |
| 2 | **Idempotency key not stored in DB** | Add optional `idempotencyKey` column to `TokenReward` model with `@@unique([idempotencyKey])` so DB enforces at-most-once; update `dedupeCreditTokens()` to check DB key and store it | `prisma/schema.prisma`, `rewardService.ts`, `rewardJob.ts` |
| 3 | **5-min `userId+reason` fallback falsely blocks or misses duplicates** | Replace the fragile `userId+reason` lookback window with entity-based dedup using the stored `idempotencyKey` column | `rewardService.ts:61-76` |
| 4 | **Referral rewards are synchronous** | Move `creditTokens()` calls in `applyReferral()` to use `queueReward()` instead | `referralService.ts:54-55` |

### Phase 2 — MODERATOR Role Completion

| # | Gap | Step | Files |
|---|---|---|---|
| 5 | **Moderators get no tokens/badges** | Add reward triggers for moderation actions: +2 per topic pinned/locked, +5 per category managed. Add `MODERATOR_ACTION` event type. Add `GUARDIAN` badge (≥10 mod actions) | `routes/community.ts`, `services/rewardService.ts`, `services/badgeService.ts`, `prisma/schema.prisma` |
| 6 | **No report/flag system** | Create `ContentReport` model in schema (reporterId, targetType, targetId, reason, status:PENDING/DISMISSED/RESOLVED, moderatorId). Create `POST /api/moderation/report` and `GET /api/admin/moderation/reports` endpoints. Create `FLAGGED_CONTENT` notification type. | `prisma/schema.prisma`, `routes/moderation.ts`, services + migration |
| 7 | **TranslationCorrection review dead** | Add `PATCH /api/admin/translations/corrections/:id` to approve/reject corrections. Allow `MODERATOR` role access (not just ADMIN). If approved, apply correction to translation. | `routes/admin/translations.ts`, `services/translationService.ts` |
| 8 | **Translation REJECTED status never used** | Add `POST /api/admin/translations/:id/reject` endpoint. Allow `MODERATOR` or `ADMIN`. If a translation is rejected, issue a notification to the author. | `routes/admin/translations.ts` |

### Phase 3 — Voting Reward Expansion

| # | Gap | Step | Files |
|---|---|---|---|
| 9 | **Topic/comment voting earns nothing** | Add +1 token for the author when their topic or comment receives an upvote (mirrors the translation upvote flow). Use entity-based idempotency key `topic-upvote:{topicId}:{voterId}`. | `services/communityService.ts` (`voteOnTopic`, `voteOnComment`) |
| 10 | **Voters get no recognition** | Add `HELPFUL_VOTER` badge (≥50 upvotes cast across translations, topics, and comments). Add badge condition function. | `services/badgeService.ts`, `prisma/schema.prisma` |

### Phase 4 — ARTIST Role Deepening

| # | Gap | Step | Files |
|---|---|---|---|
| 11 | **Artists have no special reward multipliers** | Add a `rewardMultiplier` column to the `Artist` model (default 1.0); in `creditTokens()`, if the user is a verified artist, multiply the base amount. Scale: verified artists get 1.5× on translation rewards. | `prisma/schema.prisma`, `rewardService.ts` |
| 12 | **No artist-specific badges** | Add `PLATINUM_ARTIST` badge (≥10 songs) and `FAN_FAVORITE` badge (≥100 translation views). | `prisma/schema.prisma`, `services/badgeService.ts` |

### Phase 5 — Moderation Reward Flow (the moderator token economy)

| # | Step | Detail | Files |
|---|---|---|---|
| 13 | **Create `moderationReward` event** | When a moderator resolves a report (marks RESOLVED), award +2 tokens. When a moderator approves a correction, award +3 tokens. | New `services/moderationService.ts` + integration |
| 14 | **Create `MODERATION_QUEUE` badge** | Resolve ≥20 reports → earn badge | `services/badgeService.ts` |
| 15 | **Add mod stats admin endpoint** | `GET /api/admin/moderation/stats` — count of resolved reports per moderator, pending queue size | `routes/admin/moderation.ts` |

### Phase 6 — Cross-Cutting Resilience

| # | Gap | Step | Files |
|---|---|---|---|
| 16 | **`queueReward()` swallows errors** | Remove try/catch from `queueReward()` — let caller handle failure; add BullMQ job retry config (3 retries with exponential backoff) | `services/rewardService.ts:256`, `workers.ts` |
| 17 | **Admin token adjustment bypasses queue** | Route admin adjustments through `queueReward()` instead of direct `creditTokens()` | `routes/admin/rewards.ts:32` |
| 18 | **Async reward processing for service-level calls** | REVIEW: `referralService.ts` is the only service that calls `creditTokens()` directly; also check `storeService.ts` for `purchaseItem` deduction path | `referralService.ts`, `storeService.ts` |

---

## Role-Reward Matrix (Current vs Target)

```
                        CURRENT                      TARGET
ROLE           TOKENS       BADGES           TOKENS              BADGES
──────         ──────────   ────────────      ───────────────     ─────────────────
USER           translate    EARLY_ADOPTER     same + voting       same + HELPFUL_VOTER
               +10          TOP_TRANSLATOR    rewards fixed       (≥50 votes cast)
               upvote       CULTURE_CURATOR   (topic/comment
               +2           COMMUNITY_HELPER  upvote = +1)
               topic        FIRST_PROFILE
               +5           GENEROUS_SUPPORTER
               comment      REFERRAL_STAR
               +2           DAILY_STREAK_7(stub)
               referral     SEASON_CHAMPION(stub)
               +20/+10

ARTIST         same as USER same + ARTIST_    same + 1.5×          same + PLATINUM_ARTIST
                            SPOTLIGHT         translation          (≥10 songs) +
                                              reward multiplier   FAN_FAVORITE (≥100 views)

MODERATOR      same as USER same as USER      same +               same as USER +
                                               +2 per pin/lock     GUARDIAN badge
                                               +2 per report       (≥10 mod actions) +
                                               resolved            MOD_QUEUE badge
                                               +3 per correction   (≥20 resolved reports)
                                               approved

ADMIN          manual       badge              all async via        all via queue,
               adjust       revocation         queue (no           +
               +/-1000      (admin only)       sync exceptions)    OWNER badge (admin role)
```

---

## Relevant Source Files

| File | Purpose |
|---|---|
| `backend/src/services/rewardService.ts` | Core: `creditTokens`, `dedupeCreditTokens`, `queueReward`, `getLeaderboard`, `getUserRank` |
| `backend/src/services/badgeService.ts` | `checkAndAwardBadges`, `fetchUserCounts`, `BADGE_CONDITIONS` |
| `backend/src/services/referralService.ts` | `applyReferral` (synchronous `creditTokens` calls) |
| `backend/src/services/storeService.ts` | `purchaseItem` (negative token entry via `TokenReward.create`) |
| `backend/src/jobs/translationJob.ts` | Auto-approve translation + queue reward (+10) |
| `backend/src/jobs/rewardJob.ts` | BullMQ worker: dedup → credit → badge evaluation |
| `backend/src/jobs/workers.ts` | Worker registration for `rewardQueue` (concurrency: 3) |
| `backend/src/routes/translations.ts` | Translation voting (+2 reward), request fulfillment (+5) |
| `backend/src/services/communityService.ts` | Topic creation (+5), comment creation (+2) |
| `backend/src/routes/community.ts` | Moderation endpoints (pin/lock/delete), leaderboard |
| `backend/src/routes/admin/rewards.ts` | Admin adjust tokens + revoke badge + audit log |
| `backend/prisma/schema.prisma` | All models: `TokenReward`, `UserBadge`, `BadgeType`, `Store*`, `Referral`, `LeaderboardSnapshot` |
| `frontend/services/tokenService.ts` | Frontend API client for all token/badge/store/referral endpoints |
| `frontend/pages/LeaderboardPage.tsx` | Leaderboard UI with period filters |
| `frontend/pages/TokenHistoryPage.tsx` | Paginated reward history |
| `frontend/components/community/UserBadges.tsx` | Badge display component |
| `frontend/pages/admin/RewardsManager.tsx` | Admin rewards management UI |

---

## Acceptance Criteria Status

| Criteria | Status | Notes |
|---|---|---|
| Approved translation → +10 tokens credited | ✅ PASS | `translationJob.ts:150` queues reward with amount=10, reason="Translation approved" |
| TokenReward table append-only — no UPDATE | ✅ PASS | `creditTokens()` uses `prisma.tokenReward.create()` exclusively |
| Badge awarded exactly once per type per user | ⚠️ PARTIAL | Code-level Set check exists, but no DB unique constraint `@@unique([userId, badgeType])` — race condition under concurrent load |
| Reward processing async — does not block translation API | ⚠️ MOSTLY | Translation flow uses BullMQ queue ✅. Referral rewards are synchronous ❌. Admin adjustments are synchronous ❌ |
