-- ParaPo — finish 0014: drop the terminal index it replaced
--
-- 0014 built stop_terminal_place_unique, which reads a place as the app does
-- (the informal name when there is one, else the ground name, case-folded),
-- and ended with a drop of 0007's stop_terminal_informal_unique. On the live
-- project that old index is still there beside the new one (checked against
-- pg_indexes on 2026-10-17, ticket contribute/05). The two agree on every row
-- the studio can write, so nothing is wrong today; but the review step
-- (studio-maps) replaces the terminal index, and two would confuse it. This
-- finishes what 0014 meant to do. `if exists`, so it is safe to run whether
-- or not the index is still there.
--
-- Not applied by the session that wrote it; the owner applies it. The
-- studio's message matches both index names, so it reads the same before and
-- after. Reversible with 0014's own lines:
--   create unique index stop_terminal_informal_unique on stop (lower(informal))
--     where kind = 'terminal' and informal is not null;

drop index if exists stop_terminal_informal_unique;
