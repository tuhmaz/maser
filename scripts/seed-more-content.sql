-- scripts/seed-more-content.sql
-- توسيع محتوى الوحدة الأولى (الأعداد النسبية) بدرسين إضافيين — لتقليل فجوة
-- "المحتوى شحيح" في التجربة الحقيقية. نفس أسلوب scripts/seed-demo-content.sql:
-- بذر مباشر عبر SQL (يتجاوز دورة المراجعة عمدًا لأنه محتوى تأسيسي وليس محتوى
-- حي يمر به محرر بشري) — إدارة المحتوى الفعلية بعد اليوم تتم عبر لوحة الإدارة.
-- قابل لإعادة التشغيل (idempotent عبر ON CONFLICT DO NOTHING).

BEGIN;

-- ===== الدرس الثاني: جمع وطرح الأعداد النسبية =====
INSERT INTO lessons (id, unit_id, name, summary, "order")
VALUES ('00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000010',
        'درس جمع وطرح الأعداد النسبية',
        'إجراء عمليات الجمع والطرح على الأعداد النسبية الموجبة والسالبة.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (id, name, description, difficulty) VALUES
  ('00000000-0000-0000-0000-000000000024', 'جمع الأعداد النسبية', 'إيجاد ناتج جمع عددين نسبيين موجبين أو سالبين', 'medium'),
  ('00000000-0000-0000-0000-000000000025', 'طرح الأعداد النسبية', 'إيجاد ناتج طرح عددين نسبيين موجبين أو سالبين', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_skills (lesson_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000024'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000025')
ON CONFLICT DO NOTHING;

-- س201 (جمع، اختيار مفرد)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012',
        'single_choice', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000201', 1,
        'ما ناتج (-3) + 5 ؟', 'نجمع بحساب الفرق بين القيمتين المطلقتين مع أخذ إشارة الأكبر: 5 - 3 = 2 (موجب لأن 5 أكبر).',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000221', '2', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000221', '-8', false, 'هذا ناتج الجمع كأن الإشارتين سالبتان.', 2),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000221', '8', false, 'تحقق من إشارة العدد الأكبر (5 موجب لكن الفرق هو 2 لا 8).', 3),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000221', '-2', false, 'الإشارة يجب أن تكون إشارة العدد الأكبر قيمةً مطلقة، وهو 5 (موجب).', 4)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000024')
ON CONFLICT DO NOTHING;

-- س202 (جمع سالب+سالب)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012',
        'single_choice', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000202', 1,
        'ما ناتج (-4) + (-6) ؟', 'جمع عددين سالبين: نجمع القيمتين المطلقتين ونضع إشارة سالبة: -(4+6) = -10.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000222', '-10', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000222', '10', false, 'جمع عددين سالبين ناتجه سالب دائمًا.', 2),
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000222', '-2', false, 'هذا لو كانت العملية طرحًا لا جمعًا.', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000024')
ON CONFLICT DO NOTHING;

-- س203 (صح/خطأ)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012',
        'true_false', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000203', 1,
        'ناتج جمع عددين سالبين يكون دائمًا سالبًا. (صح أم خطأ؟)',
        'صحيح: جمع عددين سالبين يزيد من "بُعدهما عن الصفر" في الاتجاه السالب دائمًا.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000223', 'صح', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000223', 'خطأ', false, 'جرّب مثالًا: (-2) + (-3) = -5، وهو سالب دائمًا في هذه الحالة.', 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000024')
ON CONFLICT DO NOTHING;

-- س204 (طرح)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000204',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012',
        'single_choice', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000224', '00000000-0000-0000-0000-000000000204', 1,
        'ما ناتج 7 - 10 ؟', 'نحوّل الطرح إلى جمع المعكوس: 7 + (-10) = -3.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-00000000040a', '00000000-0000-0000-0000-000000000224', '-3', true, NULL, 1),
  ('00000000-0000-0000-0000-00000000040b', '00000000-0000-0000-0000-000000000224', '3', false, 'تحقق من إشارة الناتج: 10 أكبر من 7 فالناتج سالب.', 2),
  ('00000000-0000-0000-0000-00000000040c', '00000000-0000-0000-0000-000000000224', '-17', false, 'هذا ناتج الجمع (7 + 10) وليس الطرح.', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000025')
ON CONFLICT DO NOTHING;

-- س205 (طرح، إدخال رقمي)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000205',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012',
        'numeric_input', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000225', '00000000-0000-0000-0000-000000000205', 1,
        'احسب: (-5) - (-8) = ؟', 'طرح عدد سالب يكافئ جمع نظيره الموجب: -5 + 8 = 3.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_answers (question_version_id, answer_value, tolerance) VALUES
  ('00000000-0000-0000-0000-000000000225', '3', 0)
ON CONFLICT DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000025')
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, quiz_type, lesson_id, subject_id, title)
VALUES ('00000000-0000-0000-0000-000000000502', 'lesson',
        '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000006',
        'اختبار درس جمع وطرح الأعداد النسبية')
ON CONFLICT (id) DO NOTHING;
INSERT INTO quiz_questions (quiz_id, question_id, "order") VALUES
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000201', 1),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000202', 2),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000203', 3),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000204', 4),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000205', 5)
ON CONFLICT DO NOTHING;

-- ===== الدرس الثالث: ضرب وقسمة الأعداد النسبية =====
INSERT INTO lessons (id, unit_id, name, summary, "order")
VALUES ('00000000-0000-0000-0000-000000000013',
        '00000000-0000-0000-0000-000000000010',
        'درس ضرب وقسمة الأعداد النسبية',
        'إجراء عمليات الضرب والقسمة على الأعداد النسبية وقاعدة الإشارات.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (id, name, description, difficulty) VALUES
  ('00000000-0000-0000-0000-000000000026', 'ضرب الأعداد النسبية', 'إيجاد ناتج ضرب عددين نسبيين وتطبيق قاعدة الإشارات', 'medium'),
  ('00000000-0000-0000-0000-000000000027', 'قسمة الأعداد النسبية', 'إيجاد ناتج قسمة عددين نسبيين وتطبيق قاعدة الإشارات', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_skills (lesson_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000026'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000027')
ON CONFLICT DO NOTHING;

-- س206 (ضرب موجب×سالب)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000206',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000013',
        'single_choice', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000226', '00000000-0000-0000-0000-000000000206', 1,
        'ما ناتج (-3) × 4 ؟', 'ضرب سالب في موجب ناتجه سالب: 3 × 4 = 12، فالناتج -12.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-00000000040d', '00000000-0000-0000-0000-000000000226', '-12', true, NULL, 1),
  ('00000000-0000-0000-0000-00000000040e', '00000000-0000-0000-0000-000000000226', '12', false, 'ضرب سالب في موجب ناتجه سالب دائمًا.', 2),
  ('00000000-0000-0000-0000-00000000040f', '00000000-0000-0000-0000-000000000226', '-7', false, 'هذا ناتج الجمع (-3 + 4) لا الضرب.', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000026')
ON CONFLICT DO NOTHING;

-- س207 (ضرب سالب×سالب)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000207',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000013',
        'single_choice', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000227', '00000000-0000-0000-0000-000000000207', 1,
        'ما ناتج (-5) × (-2) ؟', 'ضرب سالب في سالب ناتجه موجب دائمًا: 5 × 2 = 10.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000227', '10', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000227', '-10', false, 'ضرب عددين سالبين ناتجه موجب دائمًا.', 2),
  ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000227', '-7', false, 'هذا ليس ناتج الضرب.', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000026')
ON CONFLICT DO NOTHING;

-- س208 (صح/خطأ)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000208',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000013',
        'true_false', 'easy', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000228', '00000000-0000-0000-0000-000000000208', 1,
        'حاصل ضرب عددين سالبين موجب. (صح أم خطأ؟)',
        'صحيح: قاعدة الإشارات تنص على أن ضرب سالب × سالب = موجب.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000228', 'صح', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000414', '00000000-0000-0000-0000-000000000228', 'خطأ', false, 'جرّب مثالًا: (-2) × (-3) = 6، وهو موجب.', 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000026')
ON CONFLICT DO NOTHING;

-- س209 (قسمة)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000209',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000013',
        'single_choice', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000229', '00000000-0000-0000-0000-000000000209', 1,
        'ما ناتج (-12) ÷ 4 ؟', 'قسمة سالب على موجب ناتجه سالب: 12 ÷ 4 = 3، فالناتج -3.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_options (id, question_version_id, text, is_correct, wrong_reason, "order") VALUES
  ('00000000-0000-0000-0000-000000000415', '00000000-0000-0000-0000-000000000229', '-3', true, NULL, 1),
  ('00000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000229', '3', false, 'قسمة سالب على موجب ناتجه سالب دائمًا.', 2),
  ('00000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000229', '-48', false, 'هذا ناتج الضرب لا القسمة.', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000027')
ON CONFLICT DO NOTHING;

-- س210 (قسمة، إدخال رقمي)
INSERT INTO questions (id, grade_id, subject_id, unit_id, lesson_id, question_type, difficulty, status, created_by)
VALUES ('00000000-0000-0000-0000-000000000210',
        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000013',
        'numeric_input', 'medium', 'published', '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_versions (id, question_id, version_number, body, explanation, published_at, created_by)
VALUES ('00000000-0000-0000-0000-00000000022a', '00000000-0000-0000-0000-000000000210', 1,
        'احسب: (-20) ÷ (-5) = ؟', 'قسمة سالب على سالب ناتجه موجب: 20 ÷ 5 = 4.',
        now(), '00000000-0000-0000-0000-0000000000ed')
ON CONFLICT (question_id, version_number) DO NOTHING;
INSERT INTO question_answers (question_version_id, answer_value, tolerance) VALUES
  ('00000000-0000-0000-0000-00000000022a', '4', 0)
ON CONFLICT DO NOTHING;
INSERT INTO question_skills (question_id, skill_id) VALUES
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000027')
ON CONFLICT DO NOTHING;

INSERT INTO quizzes (id, quiz_type, lesson_id, subject_id, title)
VALUES ('00000000-0000-0000-0000-000000000503', 'lesson',
        '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000006',
        'اختبار درس ضرب وقسمة الأعداد النسبية')
ON CONFLICT (id) DO NOTHING;
INSERT INTO quiz_questions (quiz_id, question_id, "order") VALUES
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000206', 1),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000207', 2),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000208', 3),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000209', 4),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000210', 5)
ON CONFLICT DO NOTHING;

COMMIT;
