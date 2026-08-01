-- 0016_ai_content_permission.up.sql
-- صلاحية توليد مسودات أسئلة عبر AI (docs/ai-curriculum-roadmap.md، E04).
-- content_editor ينشئ المسودات؛ content_reviewer/support لا يحصلان عليها
-- (يراجعون، لا يولّدون). admin/super_admin يملكانها ضمن كل الصلاحيات أصلًا.

INSERT INTO permissions (key, description) VALUES
    ('ai_content.generate', 'توليد مسودة سؤال عبر مزوّد AI');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('content_editor', 'admin', 'super_admin')
  AND p.key = 'ai_content.generate';
