-- One email belongs to one CampusOps account. Older duplicate test rows keep their
-- user id and gain a unique suffix so the newest account keeps the original address.
UPDATE "User"
SET email = lower(email)
WHERE email <> lower(email);

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY lower(email) ORDER BY "createdAt" DESC, id DESC) AS rn
  FROM "User"
)
UPDATE "User" AS account
SET email = account.email || '.duplicate-' || left(account.id::text, 8)
FROM ranked
WHERE account.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
