-- ==============================================================================
-- Migration 13: Canonical public.users View over auth.users
-- Fully normalized against database/formatted_users.json
-- Eliminates duplicated/redundant alias columns
-- Exposes Supabase Auth users to PostgREST REST API (/rest/v1/users)
-- ==============================================================================

create or replace view public.users with (security_invoker = false) as
select
  u.id::text as id,
  u.email,
  coalesce(u.phone, u.raw_user_meta_data->>'phone', '') as phone,
  coalesce(u.raw_user_meta_data->>'name', '') as name,
  coalesce(u.raw_user_meta_data->>'studentId', '') as "studentId",
  coalesce(u.raw_user_meta_data->>'department', u.raw_app_meta_data->>'department', '') as department,
  coalesce(u.raw_user_meta_data->>'batch', '') as batch,
  coalesce(u.raw_user_meta_data->>'dob', '') as dob,
  coalesce(u.raw_user_meta_data->>'gender', '') as gender,
  coalesce(u.raw_user_meta_data->>'academicSystem', '') as "academicSystem",
  coalesce(u.raw_user_meta_data->>'academicLevel', 'All') as "academicLevel",
  coalesce(u.raw_user_meta_data->>'section', 'All') as section,
  coalesce(u.raw_user_meta_data->>'semester', '') as semester,
  coalesce(u.raw_user_meta_data->>'trimester', '') as trimester,
  coalesce(u.raw_user_meta_data->>'bloodGroup', '') as "bloodGroup",
  coalesce((u.raw_user_meta_data->>'allowBloodDonation')::boolean, false) as "allowBloodDonation",
  coalesce(u.raw_user_meta_data->>'location', '') as location,
  coalesce(u.raw_user_meta_data->>'city', '') as city,
  coalesce(u.raw_user_meta_data->>'area', '') as area,
  coalesce(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  coalesce(u.raw_user_meta_data->'subjects', '[]'::jsonb) as subjects,
  coalesce(u.raw_user_meta_data->'completed_subjects', '[]'::jsonb) as completed_subjects,
  coalesce((u.raw_user_meta_data->>'completed_credits')::numeric, 0) as completed_credits,
  coalesce((u.raw_user_meta_data->>'admissionDate')::bigint, 0) as "admissionDate",
  coalesce((u.raw_user_meta_data->>'email_verified')::boolean, true) as email_verified,
  coalesce((u.raw_user_meta_data->>'manuallyVerified')::boolean, false) as "manuallyVerified",
  coalesce(u.raw_app_meta_data->'roles', jsonb_build_array('student')) as roles,
  coalesce(u.raw_app_meta_data->'roles'->>0, 'student') as role,
  coalesce((u.raw_app_meta_data->>'isAdmin')::boolean, false) as "isAdmin",
  coalesce(u.raw_app_meta_data->>'status', 'active') as status,
  u.raw_user_meta_data as data,
  u.created_at,
  u.updated_at
from auth.users u;

-- Grant select and update permissions on public.users view
grant select, update on public.users to authenticated, anon;

-- INSTEAD OF UPDATE trigger function to persist changes back into auth.users.raw_user_meta_data
create or replace function public.handle_users_view_update()
returns trigger
security definer
set search_path = public, auth
language plpgsql as $$
declare
  updated_meta jsonb;
  updated_app_meta jsonb;
begin
  select coalesce(raw_user_meta_data, '{}'::jsonb), coalesce(raw_app_meta_data, '{}'::jsonb)
  into updated_meta, updated_app_meta
  from auth.users
  where id = old.id::uuid;

  if updated_meta is null then
    updated_meta := '{}'::jsonb;
  end if;
  if updated_app_meta is null then
    updated_app_meta := '{}'::jsonb;
  end if;

  if new.name is not null then
    updated_meta := jsonb_set(updated_meta, '{name}', to_jsonb(new.name));
  end if;
  if new."studentId" is not null then
    updated_meta := jsonb_set(updated_meta, '{studentId}', to_jsonb(new."studentId"));
  end if;
  if new.department is not null then
    updated_meta := jsonb_set(updated_meta, '{department}', to_jsonb(new.department));
    updated_app_meta := jsonb_set(updated_app_meta, '{department}', to_jsonb(new.department));
  end if;
  if new.batch is not null then
    updated_meta := jsonb_set(updated_meta, '{batch}', to_jsonb(new.batch));
  end if;
  if new.phone is not null then
    updated_meta := jsonb_set(updated_meta, '{phone}', to_jsonb(new.phone));
  end if;
  if new.dob is not null then
    updated_meta := jsonb_set(updated_meta, '{dob}', to_jsonb(new.dob));
  end if;
  if new.gender is not null then
    updated_meta := jsonb_set(updated_meta, '{gender}', to_jsonb(new.gender));
  end if;
  if new."academicSystem" is not null then
    updated_meta := jsonb_set(updated_meta, '{academicSystem}', to_jsonb(new."academicSystem"));
  end if;
  if new."academicLevel" is not null then
    updated_meta := jsonb_set(updated_meta, '{academicLevel}', to_jsonb(new."academicLevel"));
  end if;
  if new.section is not null then
    updated_meta := jsonb_set(updated_meta, '{section}', to_jsonb(new.section));
  end if;
  if new.semester is not null then
    updated_meta := jsonb_set(updated_meta, '{semester}', to_jsonb(new.semester));
  end if;
  if new.trimester is not null then
    updated_meta := jsonb_set(updated_meta, '{trimester}', to_jsonb(new.trimester));
  end if;
  if new."bloodGroup" is not null then
    updated_meta := jsonb_set(updated_meta, '{bloodGroup}', to_jsonb(new."bloodGroup"));
  end if;
  if new."allowBloodDonation" is not null then
    updated_meta := jsonb_set(updated_meta, '{allowBloodDonation}', to_jsonb(new."allowBloodDonation"));
  end if;
  if new.location is not null then
    updated_meta := jsonb_set(updated_meta, '{location}', to_jsonb(new.location));
  end if;
  if new.city is not null then
    updated_meta := jsonb_set(updated_meta, '{city}', to_jsonb(new.city));
  end if;
  if new.area is not null then
    updated_meta := jsonb_set(updated_meta, '{area}', to_jsonb(new.area));
  end if;
  if new.avatar_url is not null then
    updated_meta := jsonb_set(updated_meta, '{avatar_url}', to_jsonb(new.avatar_url));
  end if;
  if new.subjects is not null then
    updated_meta := jsonb_set(updated_meta, '{subjects}', new.subjects);
  end if;
  if new.completed_subjects is not null then
    updated_meta := jsonb_set(updated_meta, '{completed_subjects}', new.completed_subjects);
  end if;
  if new.completed_credits is not null then
    updated_meta := jsonb_set(updated_meta, '{completed_credits}', to_jsonb(new.completed_credits));
  end if;
  if new.roles is not null then
    updated_app_meta := jsonb_set(updated_app_meta, '{roles}', new.roles);
  end if;
  if new.status is not null then
    updated_app_meta := jsonb_set(updated_app_meta, '{status}', to_jsonb(new.status));
  end if;
  if new."isAdmin" is not null then
    updated_app_meta := jsonb_set(updated_app_meta, '{isAdmin}', to_jsonb(new."isAdmin"));
  end if;

  if new.data is not null then
    updated_meta := updated_meta || new.data;
  end if;

  update auth.users
  set raw_user_meta_data = updated_meta,
      raw_app_meta_data = updated_app_meta,
      phone = coalesce(new.phone, phone),
      updated_at = now()
  where id = old.id::uuid;

  return new;
end;
$$;

drop trigger if exists tr_public_users_update on public.users;
create trigger tr_public_users_update
instead of update on public.users
for each row execute function public.handle_users_view_update();

grant execute on function public.handle_users_view_update() to authenticated, anon, service_role;
