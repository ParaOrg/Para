-- Rows that exist before 0018, as the live project has.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000a2');
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000000e1');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into public.stop (id, name, point, kind) values
  ('10000000-0000-0000-0000-00000000000a', 'A', '{"type":"Point","coordinates":[121.00,14.60]}', 'hintuan'),
  ('10000000-0000-0000-0000-00000000000b', 'B', '{"type":"Point","coordinates":[121.01,14.60]}', 'hintuan'),
  ('10000000-0000-0000-0000-00000000000c', 'C', '{"type":"Point","coordinates":[121.02,14.60]}', 'hintuan'),
  ('10000000-0000-0000-0000-00000000000d', 'D', '{"type":"Point","coordinates":[121.03,14.60]}', 'hintuan'),
  ('10000000-0000-0000-0000-00000000000e', 'E', '{"type":"Point","coordinates":[121.04,14.60]}', 'hintuan'),
  ('10000000-0000-0000-0000-0000000000f1', 'Cubao', '{"type":"Point","coordinates":[121.05,14.60]}', 'terminal');
insert into public.route (id, signboard, head_stop_id, tail_stop_id) values
  ('20000000-0000-0000-0000-000000000001', 'A–B', '10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b');
insert into public.route (id, signboard, is_loop) values
  ('20000000-0000-0000-0000-0000000000c1', 'Ikot', true);
insert into public.route_variant (id, route_id, reversed) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', false),
  ('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', false);
insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 1);
