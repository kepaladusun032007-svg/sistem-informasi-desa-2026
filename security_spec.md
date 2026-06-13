# Security Specification: RW Management App

## 1. Data Invariants
- A Warga (resident) must belong to a valid `rwId` (e.g. "RW 01").
- A transaction amount must be positive.
- An issue report must remain locked once marked terminal ("Selesai" or "Arsip").

## 2. Dirty Dozen Payloads (Intrusive Actions)
1. Creating a resident without a valid `rwId` (orphan).
2. Changing another RW's resident's address from outside that RW.
3. Injecting a 1MB string into the `nik` field to cause resource attacks.
4. Setting a transaction amount to negative to drain community balances.
5. Setting the status of an assist request directly to "Setuju" bypasses verification.
6. Deleting transactional logs to cover up budget fraud.
7. Modifying a completed report's details to alter history.
8. Accessing other people's detailed personal information (NIK, KK) without authentication.
9. Privilege escalation by modifying a user's own `role` property in `users/`.
10. Creating dual-identities for same KK and NIK.
11. Bypassing state flow for requests.
12. Poisoning document IDs with junk or malicious strings.

## 3. Passive Protection Schema
All collections in Firestore are protected. By default, write access is permitted to the respective Ketua RW (who owns the correct `rwId` attribute matched against the login token or user account) and the overall Admin (Kepala Dusun).
