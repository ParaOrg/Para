-- Para — get_my_uses: which of my rides an editor used, and for what
--
-- Gab asked (PARA GC, 2026-10-31) whether a contributor can see it when an
-- editor uses their ride to draw a route. get_my_stats already counts it
-- (routes_helped, hintuans_helped) but never says which ride or which route.
-- This lists, for the signed-in contributor, each of their rides an editor
-- used ("Use this line" or "Draw a hintuan here") and the name of what it
-- became, so History can say it on the ride's card.
--
-- Only what is approved now: a use whose direction is still a draft, was
-- discarded, or whose route or hintuan was taken down is left out, so a card
-- never names something that is not on the map. A ride the contributor or an
-- editor hid is left out too, as get_my_stats leaves it out.
--
-- Who may do what:
--   a phone   calls get_my_uses() and gets only its own rides; it has no grant
--             on contribution_use, so the definer reads it for it.
--   anon      nothing.
--
-- Written, not applied: the owner applies it and regenerates database.types.ts.

create function public.get_my_uses()
returns table (contribution_id uuid, kind text, name text)
language sql stable security definer set search_path = '' as $$
  select u.contribution_id, u.kind, v.direction_name
  from public.contribution_use u
  join public.contribution c on c.id = u.contribution_id
  join public.route_variant v on v.id = u.subject_id
  join public.route r on r.id = v.route_id
  where u.kind = 'direction'
    and c.contributor_id = (select auth.uid())
    and c.hidden_at is null
    and r.status = 'approved'
  union
  select u.contribution_id, u.kind, coalesce(nullif(s.informal, ''), s.name)
  from public.contribution_use u
  join public.contribution c on c.id = u.contribution_id
  join public.stop s on s.id = u.subject_id
  where u.kind = 'hintuan'
    and c.contributor_id = (select auth.uid())
    and c.hidden_at is null
    and s.status = 'approved'
  order by 1, 2, 3;
$$;

revoke all on function public.get_my_uses() from public, anon;
grant execute on function public.get_my_uses() to authenticated;
