-- 0019_book_analysis_import.up.sql
-- إشارة دائمة أن مسودة تحليل كتاب استُورِدت فعليًا إلى المنهاج الحقيقي
-- (docs/ai-curriculum-roadmap.md — E10 المرحلة 2)، بدل الاعتماد على حالة عابرة.

ALTER TABLE book_analyses ADD COLUMN imported_at TIMESTAMPTZ;
