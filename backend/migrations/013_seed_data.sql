-- Seed revenue settings default
INSERT INTO revenue_settings (default_platform_pct) VALUES (30);

-- Seed categories: Boards
INSERT INTO categories (name, slug, type, sort_order) VALUES
('CBSE English Medium', 'cbse-english', 'board', 1),
('CBSE Hindi Medium', 'cbse-hindi', 'board', 2),
('MP Board', 'mp-board', 'board', 3),
('UP Board', 'up-board', 'board', 4),
('Bihar Board', 'bihar-board', 'board', 5);

-- Seed categories: Classes (under CBSE English)
INSERT INTO categories (name, slug, type, parent_id, sort_order)
SELECT name, slug, 'class', (SELECT id FROM categories WHERE slug = 'cbse-english'), sort_order
FROM (VALUES
  ('Class 12', 'cbse-en-class-12', 1),
  ('Class 11', 'cbse-en-class-11', 2),
  ('Class 10', 'cbse-en-class-10', 3),
  ('Class 9', 'cbse-en-class-9', 4)
) AS t(name, slug, sort_order);

-- Seed categories: Streams (under Class 12)
INSERT INTO categories (name, slug, type, parent_id, sort_order)
SELECT name, slug, 'stream', (SELECT id FROM categories WHERE slug = 'cbse-en-class-12'), sort_order
FROM (VALUES
  ('Science', 'cbse-en-12-science', 1),
  ('Commerce', 'cbse-en-12-commerce', 2),
  ('Humanities', 'cbse-en-12-humanities', 3)
) AS t(name, slug, sort_order);
