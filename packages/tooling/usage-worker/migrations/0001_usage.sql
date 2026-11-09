CREATE TABLE usage_installations (
  id TEXT PRIMARY KEY,
  first_day TEXT NOT NULL,
  last_day TEXT NOT NULL
);
CREATE INDEX usage_installations_last_day ON usage_installations(last_day);

CREATE TABLE usage_days (
  installation_id TEXT NOT NULL REFERENCES usage_installations(id),
  day TEXT NOT NULL,
  read INTEGER NOT NULL CHECK (read IN (0, 1)),
  edited INTEGER NOT NULL CHECK (edited IN (0, 1)),
  PRIMARY KEY (installation_id, day)
);
CREATE INDEX usage_days_day ON usage_days(day);
