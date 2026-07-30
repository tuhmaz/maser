-- 0008_achievements_seed.up.sql
-- بذرة كتالوج الإنجازات (docs/daily-plan-rules.md §نظام الإنجازات).
-- منح إنجاز يتم عبر INSERT ... ON CONFLICT DO NOTHING على student_achievements،
-- لذا استدعاء المنح أكثر من مرة آمن طبيعيًا (idempotent) دون منطق "هل هي المرة الأولى؟".

INSERT INTO achievements (key, title, description) VALUES
    ('first_quiz', 'أول اختبار', 'أكملت أول اختبار على المنصة'),
    ('first_task', 'أول مهمة يومية', 'أكملت أول مهمة من خطتك اليومية'),
    ('first_mistake_reviewed', 'أول مراجعة', 'راجعت أول خطأ في دفترك'),
    ('first_skill_mastered', 'أول مهارة متقنة', 'أتقنت أول مهارة بالكامل'),
    ('streak_3', 'ثلاثة أيام متواصلة', 'درست ثلاثة أيام متتالية'),
    ('streak_7', 'أسبوع متواصل', 'درست سبعة أيام متتالية'),
    ('streak_30', 'شهر متواصل', 'درست ثلاثين يومًا متتاليًا')
ON CONFLICT (key) DO NOTHING;
