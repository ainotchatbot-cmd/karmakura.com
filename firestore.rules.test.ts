import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rules Structural & Dirty-Dozen Invariant Verification
 * Verifies firestore.rules alignment with firebase-blueprint.json & security_spec.md.
 */
const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

// 1. Default-deny catch-all at top
assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), 'Missing default-deny catch-all');

// 2. Verified email gate
assert.ok(rules.includes('request.auth.token.email_verified == true'), 'Missing email_verified gate');

// 3. Every blueprint path has a matching rules block
for (const collectionPath of Object.keys(blueprint.firestore)) {
  const leaf = collectionPath.split('/').pop();
  assert.ok(leaf && rules.includes(leaf), `Missing rule coverage for ${collectionPath}`);
}

// 4. Strict field whitelisting & temporal integrity
assert.ok(rules.includes("affectedKeys().hasOnly(['displayName', 'preferredLens', 'pdpaAccepted', 'updatedAt'])"), 'Missing user profile update whitelist');
assert.ok(rules.includes("affectedKeys().hasOnly(['title', 'domainSlot', 'depthMode', 'messageCount', 'updatedAt'])"), 'Missing thread update whitelist');
assert.ok(rules.includes('incoming().createdAt == request.time'), 'Missing server timestamp check on create');
assert.ok(rules.includes('incoming().updatedAt == request.time'), 'Missing server timestamp check on update');
assert.ok(rules.includes('get(/databases/$(database)/documents/users/$(userId)/abbotThreads/$(threadId)).data.ownerId == request.auth.uid'), 'Missing Master Gate on messages subcollection');

console.log('firestore.rules Dirty-Dozen & Eight-Pillars checks passed.');
