-- Rolling UTC windows include today (which may be incomplete).
WITH windows(label, days) AS (VALUES ('daily', 1), ('weekly', 7), ('monthly', 30))
SELECT w.label AS period,
       COUNT(DISTINCT d.installation_id) AS active_installations,
       COUNT(DISTINCT CASE WHEN d.read = 1 THEN d.installation_id END) AS readers,
       COUNT(DISTINCT CASE WHEN d.edited = 1 THEN d.installation_id END) AS editors,
       COUNT(DISTINCT CASE WHEN i.first_day < d.day THEN d.installation_id END) AS returning_installations
FROM windows w
LEFT JOIN usage_days d ON d.day BETWEEN date('now', '-' || (w.days - 1) || ' days') AND date('now')
LEFT JOIN usage_installations i ON i.id = d.installation_id
GROUP BY w.label, w.days ORDER BY w.days;

-- Daily activity for the last 30 days. Missing days have zero recorded activity.
SELECT d.day, COUNT(*) AS active_installations,
       SUM(d.read) AS readers, SUM(d.edited) AS editors,
       SUM(CASE WHEN i.first_day < d.day THEN 1 ELSE 0 END) AS returning_installations
FROM usage_days d JOIN usage_installations i ON i.id = d.installation_id
WHERE d.day >= date('now', '-29 days')
GROUP BY d.day ORDER BY d.day DESC;

-- Exact-day retention. Only completed follow-up days and cohorts whose first
-- activity remains inside the 90-day observation window enter the denominator.
WITH offsets(days) AS (VALUES (7), (30))
SELECT o.days AS retention_day, COUNT(i.id) AS eligible_installations,
       COUNT(d.installation_id) AS retained_installations,
       ROUND(100.0 * COUNT(d.installation_id) / NULLIF(COUNT(i.id), 0), 1) AS retention_percent
FROM offsets o
LEFT JOIN usage_installations i ON i.first_day >= date('now', '-89 days')
  AND date(i.first_day, '+' || o.days || ' days') < date('now')
LEFT JOIN usage_days d ON d.installation_id = i.id
  AND d.day = date(i.first_day, '+' || o.days || ' days')
GROUP BY o.days ORDER BY o.days;
