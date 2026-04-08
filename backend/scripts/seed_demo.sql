DO $$
DECLARE
  v_inst UUID;
  v_cbse UUID;
  v_c12 UUID;
  v_sci UUID;
  v_cid UUID;
  v_ch UUID;
BEGIN
  SELECT id INTO v_inst FROM users WHERE email='instructor@magnetbrains.com';
  SELECT id INTO v_cbse FROM categories WHERE slug='cbse-english';
  SELECT id INTO v_c12 FROM categories WHERE slug='cbse-en-class-12';
  SELECT id INTO v_sci FROM categories WHERE slug='cbse-en-12-science';

  -- Physics (Free)
  INSERT INTO courses (instructor_id, title, slug, description, short_desc, board_id, class_id, stream_id, is_free, price, language, level, status, published_at, total_chapters, total_lectures, total_duration, total_enrollments, syllabus_points, tags)
  VALUES (v_inst, 'Complete Physics - Class 12 CBSE', 'complete-physics-class-12',
    'Master all physics concepts for Class 12 CBSE. Covers mechanics, thermodynamics, optics, electromagnetism, and modern physics.',
    'Complete Class 12 Physics with 100+ lectures',
    v_cbse, v_c12, v_sci, true, 0, 'hindi', 'intermediate', 'published', NOW(), 3, 9, 16200, 245,
    ARRAY['Mechanics & Laws of Motion','Thermodynamics','Optics & Wave Theory','Electromagnetism','Modern Physics'],
    ARRAY['physics','cbse','class 12','science'])
  RETURNING id INTO v_cid;

  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Mechanics', 1) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Laws of Motion - Introduction', 1, 1800, true, true),
    (v_ch, v_cid, 'Newtons Laws - Problems', 2, 2400, false, true),
    (v_ch, v_cid, 'Friction & Circular Motion', 3, 1800, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Thermodynamics', 2) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Heat & Temperature Basics', 1, 1500, true, true),
    (v_ch, v_cid, 'Laws of Thermodynamics', 2, 2100, false, true),
    (v_ch, v_cid, 'Carnot Engine & Efficiency', 3, 1800, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Optics', 3) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Reflection & Refraction', 1, 1800, false, true),
    (v_ch, v_cid, 'Lens & Mirror Formulas', 2, 2100, false, true),
    (v_ch, v_cid, 'Wave Optics - Interference', 3, 1800, false, true);

  -- Chemistry (Free)
  INSERT INTO courses (instructor_id, title, slug, description, short_desc, board_id, class_id, stream_id, is_free, price, language, level, status, published_at, total_chapters, total_lectures, total_duration, total_enrollments, tags)
  VALUES (v_inst, 'Chemistry Full Course - Class 12', 'chemistry-full-course-class-12',
    'Comprehensive chemistry covering organic, inorganic, and physical chemistry for CBSE Class 12.',
    'Master Chemistry for boards and entrance exams',
    v_cbse, v_c12, v_sci, true, 0, 'hindi', 'intermediate', 'published', NOW(), 3, 9, 14400, 189,
    ARRAY['chemistry','cbse','class 12'])
  RETURNING id INTO v_cid;

  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Physical Chemistry', 1) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Solutions & Colligative Properties', 1, 1500, true, true),
    (v_ch, v_cid, 'Electrochemistry', 2, 1800, false, true),
    (v_ch, v_cid, 'Chemical Kinetics', 3, 1600, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Organic Chemistry', 2) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Alcohols, Phenols & Ethers', 1, 1800, false, true),
    (v_ch, v_cid, 'Aldehydes & Ketones', 2, 1500, false, true),
    (v_ch, v_cid, 'Amines & Biomolecules', 3, 1700, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Inorganic Chemistry', 3) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'd and f Block Elements', 1, 1500, false, true),
    (v_ch, v_cid, 'Coordination Compounds', 2, 1800, false, true),
    (v_ch, v_cid, 'Metallurgy', 3, 1200, false, true);

  -- Mathematics (Paid)
  INSERT INTO courses (instructor_id, title, slug, description, short_desc, board_id, class_id, stream_id, is_free, price, discount_pct, language, level, status, published_at, total_chapters, total_lectures, total_duration, total_enrollments, tags)
  VALUES (v_inst, 'Mathematics Premium - Class 12', 'mathematics-premium-class-12',
    'Advanced mathematics covering calculus, algebra, vectors, 3D geometry, and probability with exam strategies.',
    'Premium Math course with exam-focused approach',
    v_cbse, v_c12, v_sci, false, 499, 20, 'english', 'advanced', 'published', NOW(), 3, 9, 18000, 67,
    ARRAY['mathematics','cbse','class 12','premium'])
  RETURNING id INTO v_cid;

  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Calculus', 1) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Limits & Continuity', 1, 2000, true, true),
    (v_ch, v_cid, 'Differentiation Techniques', 2, 2400, false, true),
    (v_ch, v_cid, 'Integration - Definite & Indefinite', 3, 2200, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Algebra & Vectors', 2) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Matrices & Determinants', 1, 1800, false, true),
    (v_ch, v_cid, 'Vector Algebra', 2, 2000, false, true),
    (v_ch, v_cid, '3D Geometry', 3, 1800, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Probability & Statistics', 3) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Probability Distributions', 1, 1800, false, true),
    (v_ch, v_cid, 'Bayes Theorem & Applications', 2, 2000, false, true),
    (v_ch, v_cid, 'Linear Programming', 3, 1800, false, true);

  -- Biology (Free)
  INSERT INTO courses (instructor_id, title, slug, description, short_desc, board_id, class_id, stream_id, is_free, price, language, level, status, published_at, total_chapters, total_lectures, total_duration, total_enrollments, tags)
  VALUES (v_inst, 'Biology Complete - Class 12 CBSE', 'biology-complete-class-12',
    'Full biology course covering botany and zoology with NCERT-aligned content and practice questions.',
    'Complete Biology for CBSE Class 12',
    v_cbse, v_c12, v_sci, true, 0, 'hindi', 'intermediate', 'published', NOW(), 3, 9, 12600, 312,
    ARRAY['biology','cbse','class 12','neet'])
  RETURNING id INTO v_cid;

  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Reproduction', 1) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Sexual Reproduction in Plants', 1, 1400, true, true),
    (v_ch, v_cid, 'Human Reproduction', 2, 1600, false, true),
    (v_ch, v_cid, 'Reproductive Health', 3, 1200, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Genetics & Evolution', 2) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Principles of Inheritance', 1, 1800, false, true),
    (v_ch, v_cid, 'Molecular Basis of Inheritance', 2, 1500, false, true),
    (v_ch, v_cid, 'Evolution - Theories & Evidence', 3, 1400, false, true);
  INSERT INTO chapters (course_id, title, sort_order) VALUES (v_cid, 'Ecology', 3) RETURNING id INTO v_ch;
  INSERT INTO lectures (chapter_id, course_id, title, sort_order, duration, is_preview, is_published) VALUES
    (v_ch, v_cid, 'Organisms & Populations', 1, 1200, false, true),
    (v_ch, v_cid, 'Ecosystem - Structure & Function', 2, 1500, false, true),
    (v_ch, v_cid, 'Biodiversity & Conservation', 3, 1300, false, true);

  RAISE NOTICE 'Seeded 4 courses, 12 chapters, 36 lectures';
END $$;
