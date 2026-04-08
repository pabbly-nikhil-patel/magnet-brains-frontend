-- Expand category types to support non-academic categories
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_type_check
    CHECK (type IN ('board', 'class', 'stream', 'subject', 'domain', 'topic', 'subtopic'));

-- Add description and image fields for richer category display
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS course_count INT NOT NULL DEFAULT 0;

-- Domain: Top-level grouping (Academic, Government Exams, Skill Development, etc.)
-- Topic: Under a domain (e.g., Banking under Government Exams)
-- Subtopic: Under a topic (e.g., RBI Grade B under Banking)

-- Seed top-level domains
INSERT INTO categories (name, slug, type, sort_order, description) VALUES
('Academic Courses', 'academic', 'domain', 1, 'Board-wise courses for Class 1 to 12'),
('Government Exams', 'govt-exams', 'domain', 2, 'Prepare for government competitive exams'),
('Competitive Exams', 'competitive-exams', 'domain', 3, 'JEE, NEET, CUET and other entrance exams'),
('Skill Development', 'skill-development', 'domain', 4, 'Learn new skills for career growth');

-- Government Exam Topics
INSERT INTO categories (name, slug, type, parent_id, sort_order, description) VALUES
('Banking & Insurance', 'banking-insurance', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 1, 'SBI, IBPS, RBI, LIC exams'),
('Railways', 'railways', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 2, 'RRB NTPC, Group D, ALP exams'),
('SSC', 'ssc', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 3, 'SSC CGL, CHSL, MTS, GD exams'),
('UPSC', 'upsc', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 4, 'Civil Services, IAS, IPS preparation'),
('State PSC', 'state-psc', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 5, 'MPPSC, UPPSC, BPSC and other state exams'),
('Defence', 'defence', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 6, 'NDA, CDS, AFCAT preparation'),
('Teaching', 'teaching-exams', 'topic', (SELECT id FROM categories WHERE slug = 'govt-exams'), 7, 'CTET, Super TET, KVS, NVS exams');

-- Government Exam Subtopics
INSERT INTO categories (name, slug, type, parent_id, sort_order) VALUES
('SBI PO', 'sbi-po', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 1),
('SBI Clerk', 'sbi-clerk', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 2),
('IBPS PO', 'ibps-po', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 3),
('IBPS Clerk', 'ibps-clerk', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 4),
('RBI Grade B', 'rbi-grade-b', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 5),
('RBI Assistant', 'rbi-assistant', 'subtopic', (SELECT id FROM categories WHERE slug = 'banking-insurance'), 6),
('RRB NTPC', 'rrb-ntpc', 'subtopic', (SELECT id FROM categories WHERE slug = 'railways'), 1),
('RRB Group D', 'rrb-group-d', 'subtopic', (SELECT id FROM categories WHERE slug = 'railways'), 2),
('RRB ALP', 'rrb-alp', 'subtopic', (SELECT id FROM categories WHERE slug = 'railways'), 3),
('SSC CGL', 'ssc-cgl', 'subtopic', (SELECT id FROM categories WHERE slug = 'ssc'), 1),
('SSC CHSL', 'ssc-chsl', 'subtopic', (SELECT id FROM categories WHERE slug = 'ssc'), 2),
('SSC MTS', 'ssc-mts', 'subtopic', (SELECT id FROM categories WHERE slug = 'ssc'), 3),
('SSC GD', 'ssc-gd', 'subtopic', (SELECT id FROM categories WHERE slug = 'ssc'), 4);

-- Competitive Exam Topics
INSERT INTO categories (name, slug, type, parent_id, sort_order, description) VALUES
('JEE Main & Advanced', 'jee', 'topic', (SELECT id FROM categories WHERE slug = 'competitive-exams'), 1, 'Engineering entrance preparation'),
('NEET', 'neet', 'topic', (SELECT id FROM categories WHERE slug = 'competitive-exams'), 2, 'Medical entrance preparation'),
('CUET', 'cuet', 'topic', (SELECT id FROM categories WHERE slug = 'competitive-exams'), 3, 'Central university entrance test'),
('CA Foundation', 'ca-foundation', 'topic', (SELECT id FROM categories WHERE slug = 'competitive-exams'), 4, 'Chartered Accountancy foundation');

-- Skill Development Topics
INSERT INTO categories (name, slug, type, parent_id, sort_order, description) VALUES
('Computer Science', 'computer-science', 'topic', (SELECT id FROM categories WHERE slug = 'skill-development'), 1, 'Programming, web development, data science'),
('Digital Marketing', 'digital-marketing', 'topic', (SELECT id FROM categories WHERE slug = 'skill-development'), 2, 'SEO, social media, content marketing'),
('English Speaking', 'english-speaking', 'topic', (SELECT id FROM categories WHERE slug = 'skill-development'), 3, 'Spoken English and communication skills'),
('Tally & Accounting', 'tally-accounting', 'topic', (SELECT id FROM categories WHERE slug = 'skill-development'), 4, 'Tally ERP, GST, accounting fundamentals');

-- Move existing boards under Academic domain
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'academic')
WHERE type = 'board' AND parent_id IS NULL;
