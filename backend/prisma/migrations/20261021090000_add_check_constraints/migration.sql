-- priority_rank is a denormalised sort key; make the database reject any drift from priority.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_rank_matches_priority"
  CHECK ("priority_rank" = CASE "priority" WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 END);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_not_blank" CHECK (length(btrim("title")) > 0);
ALTER TABLE "projects" ADD CONSTRAINT "projects_name_not_blank" CHECK (length(btrim("name")) > 0);
