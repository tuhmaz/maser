-- scripts/seed-demo-content.sql
-- محتوى تجريبي لبيئة التطوير/الاختبار فقط — لا يُطبَّق على الإنتاج.
-- (المحتوى الحقيقي يمر بدورة المراجعة في docs/question-model.md قبل النشر.)
--
-- يبذر: وحدة → درس → 3 مهارات → 6 أسئلة منشورة → اختبار درس واحد.
-- كل المعرفات ثابتة وقابلة لإعادة التشغيل (idempotent عبر ON CONFLICT DO NOTHING).

BEGIN;

-- مستخدم نظام للمحتوى (لا يُستخدم للدخول الفعلي)
INSERT INTO users (id, email, password_hash, display_name)
VALUES ('00000000-0000-0000-0000-0000000000ed',
        'content-seed@alemedu.local',
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        'بذرة المحتوى')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-0000000000ed', id FROM roles WHERE name = 'content_editor'
ON CONFLICT DO NOTHING;

-- الوحدة والدرس (تحت مادة الرياضيات المبذورة في 0003)
INSERT INTO units (id, subject_id, name, "order")
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000006',
        'الوحدة الأولى: الأعداد النسبية', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, unit_id, name, summary, "order")
VALUES ('00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000010',
        'درس الأعداد النسبية',
        'مقارنة الأعداد النسبية وترتيبها وتمثيلها على خط الأعداد.', 1)
ON CONFLICT (id) DO NOTHING;

-- المهارات الثلاث (مثال docs/curriculum-structure.md حرفيًا)
INSERT INTO skills (id, name, description, difficulty) VALUES
  ('00000000-0000-0000-0000-000000000021', 'مقارنة الأعداد النسبية', 'تحديد الأكبر والأصغر بين عددين نسبيين', 'easy'),
  ('00000000-0000-0000-0000-000000000022', 'ترتيب الأعداد النسبية', 'ترتيب مجموعة أعداد نسبية تصاعديًا أو تنازليًا', 'medium'),
  ('00000000-0000-0000-0000-000000000023', 'تمثيل الأعداد على خط الأعداد', 'تحديد موقع عدد نسبي على خط الأعداد', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_skills (lesson_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000023')
ON CONFLICT DO NOTHING;

-- ===== الأسئلة =====
-- دالة مساعدة نمطية: question + version(v1, published) + options/answers + skill link

-- س1 (مقارنة، اختيار مفرد): أي العددين أكبر؟
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'single_choice', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000101', 1,
        'أي العددين التاليين أكبر؟',
        'العدد -2 أكبر من -5 لأنه أقرب إلى الصفر على خط الأعداد.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', '-2', true,  NULL, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', '-5', false, 'العدد -5 أبعد عن الصفر في الاتجاه السالب، فهو الأصغر.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000021')
ON CONFLICT DO NOTHING;

-- س2 (مقارنة، صح/خطأ): 3/4 أكبر من 2/3
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'true_false', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000102', 1,
        'العدد 3/4 أكبر من العدد 2/3. (صح أم خطأ؟)',
        'بتوحيد المقامات: 9/12 مقابل 8/12، إذن 3/4 أكبر.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000202', 'صح',  true,  NULL, 1),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000202', 'خطأ', false, 'وحّد المقامات ثم قارن البسطين.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000021')
ON CONFLICT DO NOTHING;

-- س3 (ترتيب): رتب الأعداد تصاعديًا
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'ordering', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000103', 1,
        'رتّب الأعداد التالية تصاعديًا (من الأصغر إلى الأكبر).',
        'الأعداد السالبة الأبعد عن الصفر أصغر: -3 ثم -1 ثم 2.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_options (id, question_version_id, text, is_correct, "order") VALUES
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000203', '-3', true, 1),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000203', '-1', true, 2),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000203', '2',  true, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000022')
ON CONFLICT DO NOTHING;

-- س4 (ترتيب، اختيار مفرد): أي ترتيب صحيح؟
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000104',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'single_choice', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000204',
        '00000000-0000-0000-0000-000000000104', 1,
        'أي مما يلي ترتيب تنازلي صحيح؟',
        'الترتيب التنازلي يبدأ بالأكبر: 1 ثم -2 ثم -4.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000204', '1 ، -2 ، -4', true,  NULL, 1),
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000204', '-4 ، -2 ، 1', false, 'هذا ترتيب تصاعدي وليس تنازليًا.', 2),
  ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-000000000204', '-2 ، 1 ، -4', false, 'الترتيب غير متسق لا تصاعديًا ولا تنازليًا.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000022')
ON CONFLICT DO NOTHING;

-- س5 (خط الأعداد، إدخال رقم): منتصف المسافة بين -2 و 4
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000105',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'numeric_input', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000205',
        '00000000-0000-0000-0000-000000000105', 1,
        'ما العدد الواقع في منتصف المسافة بين -2 و 4 على خط الأعداد؟',
        'المنتصف = (-2 + 4) ÷ 2 = 1.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_answers (id, question_version_id, answer_value, tolerance)
VALUES ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000205', '1', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000023')
ON CONFLICT DO NOTHING;

-- س6 (خط الأعداد، اختيار مفرد): موقع -1.5
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000106',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        'single_choice', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000206',
        '00000000-0000-0000-0000-000000000106', 1,
        'أين يقع العدد -1.5 على خط الأعداد؟',
        '-1.5 يقع بين -2 و -1 (أقرب لمنتصف المسافة بينهما).',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;

INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-00000000030b', '00000000-0000-0000-0000-000000000206', 'بين -2 و -1', true,  NULL, 1),
  ('00000000-0000-0000-0000-00000000030c', '00000000-0000-0000-0000-000000000206', 'بين -1 و 0',  false, '-1.5 أصغر من -1 فيقع على يساره.', 2),
  ('00000000-0000-0000-0000-00000000030d', '00000000-0000-0000-0000-000000000206', 'بين 1 و 2',   false, '-1.5 عدد سالب فلا يقع في الجهة الموجبة.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_skills (question_id, skill_id)
VALUES ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000023')
ON CONFLICT DO NOTHING;

-- ===== اختبار الدرس =====
INSERT INTO quizzes (id, quiz_type, lesson_id, subject_id, title)
VALUES ('00000000-0000-0000-0000-000000000501', 'lesson',
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000006',
        'اختبار درس الأعداد النسبية')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (quiz_id, question_id, "order") VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 1),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000102', 2),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000103', 3),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000104', 4),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000105', 5),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000106', 6)
ON CONFLICT DO NOTHING;

COMMIT;
