-- 0013_seed_permissions.up.sql
-- ينقل مصدر الحقيقة لصلاحيات الأدوار الإدارية الفرعية من خريطة ثابتة بالكود
-- (middleware/permissions.go) إلى جداول permissions/role_permissions الموجودة
-- منذ 0001 وغير المُستخدَمة إطلاقًا. لا تغيير سلوكي: كل دور يحصل على نفس
-- المجموعة الحالية بالضبط.

INSERT INTO permissions (key, description) VALUES
    ('curriculum.read', 'قراءة الصفوف والمواد والوحدات والدروس والمهارات'),
    ('curriculum.write', 'تعديل الصفوف والمواد والوحدات والدروس والمهارات'),
    ('questions.read', 'قراءة الأسئلة'),
    ('questions.edit', 'إنشاء وتعديل الأسئلة'),
    ('questions.review', 'مراجعة الأسئلة المُرسَلة للمراجعة'),
    ('questions.publish', 'نشر أو أرشفة الأسئلة'),
    ('users.read', 'قراءة قائمة المستخدمين'),
    ('reports.read', 'قراءة تقارير الاستخدام العامة'),
    ('content_issues.read', 'قراءة بلاغات المحتوى'),
    ('content_issues.resolve', 'حل بلاغات المحتوى'),
    ('users.role_change', 'تغيير دور مستخدم'),
    ('feature_flags.manage', 'إدارة أعلام الميزات'),
    ('settings.manage', 'إدارة إعدادات الموقع'),
    ('audit_logs.read', 'قراءة سجلّ التدقيق');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'content_editor'
  AND p.key IN ('curriculum.read', 'curriculum.write', 'questions.read', 'questions.edit');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'content_reviewer'
  AND p.key IN ('curriculum.read', 'questions.read', 'questions.review', 'questions.publish', 'content_issues.read');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'support'
  AND p.key IN ('users.read', 'reports.read', 'content_issues.read', 'content_issues.resolve');

-- admin/super_admin: كل الصلاحيات صراحةً (كانت "*" ضمنية بالخريطة القديمة).
-- الصلاحيات الحساسة (role_change/feature_flags/settings/audit_logs) تبقى
-- مُقيَّدة إضافيًا بـ requireAdmin في الراوتر، فهذا الإدراج لا يفتحها لأدوار أخرى.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('admin', 'super_admin');
