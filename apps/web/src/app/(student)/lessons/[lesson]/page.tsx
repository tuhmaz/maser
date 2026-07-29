"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Lesson } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /lessons/[lesson]: صفحة الدرس — بطاقة "هل فهمت هذا الدرس؟ اختبر نفسك الآن"
// (docs/analytics-events.md، إعلان alemancenter داخل الدرس مشابه لهذا النمط)
export default function LessonPage() {
  const params = useParams<{ lesson: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    api.getLesson(params.lesson).then(setLesson).catch(() => setLesson(null));
  }, [params.lesson]);

  if (!lesson) return <p className="text-gray-500">جارٍ التحميل...</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{lesson.name}</h1>
      {lesson.summary && <p className="text-gray-600">{lesson.summary}</p>}

      <div className="mt-6 rounded-lg border p-6 text-center">
        <p className="mb-3 font-medium">هل فهمت هذا الدرس؟</p>
        <Button disabled title="محرك الاختبارات قيد البناء">
          اختبر نفسك الآن
        </Button>
      </div>
    </div>
  );
}
