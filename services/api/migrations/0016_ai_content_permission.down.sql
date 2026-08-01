-- 0016_ai_content_permission.down.sql
DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE key = 'ai_content.generate');
DELETE FROM permissions WHERE key = 'ai_content.generate';
