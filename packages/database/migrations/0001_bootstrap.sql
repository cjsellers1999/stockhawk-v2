create table service_heartbeat (
  service_name text primary key,
  observed_at timestamptz not null
);
