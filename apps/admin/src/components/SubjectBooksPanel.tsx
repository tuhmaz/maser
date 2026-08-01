"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, Upload } from "lucide-react";
import type { AdminSubjectBook, BookType } from "@alemedu/api-client";
import { api } from "@/lib/api";
import { AdminStatusBadge } from "@/components/AdminPageHeader";
import { BookAnalysisReviewModal } from "@/components/BookAnalysisReviewModal";

// لوحة كتب المادة (docs/ai-curriculum-roadmap.md — E10): رفع كتاب الطالب/
// التمارين/المعلم (PDF)، متابعة تحليل AI غير المتزامن (ai_jobs) حتى اكتماله،
// ثم مراجعة/تعديل/استيراد المقترَح فعليًا إلى المنهاج عبر BookAnalysisReviewModal
// (المرحلة 2) — لا كتابة تلقائية، اعتماد إداري صريح فقط.

const BOOK_TYPE_LABELS: Record<BookType, string> = {
  student: "كتاب الطالب",
  exercises: "كتاب التمارين",
  teacher: "كتاب المعلم",
};

const BOOK_TYPES: BookType[] = ["student", "exercises", "teacher"];

export function SubjectBooksPanel({ subjectId }: { subjectId: string }) {
  const [books, setBooks] = useState<AdminSubjectBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<BookType | null>(null);
  const [viewingAnalysis, setViewingAnalysis] = useState<AdminSubjectBook | null>(null);
  const fileInputs = useRef<Partial<Record<BookType, HTMLInputElement | null>>>({});

  function load() {
    api.adminListSubjectBooks(subjectId).then(setBooks).catch((err: any) => setError(err?.message ?? "تعذّر جلب كتب المادة"));
  }

  useEffect(load, [subjectId]);

  // استطلاع دوري بسيط أثناء وجود تحليل قيد المعالجة — التحليل غير متزامن (ai_jobs).
  useEffect(() => {
    const hasPending = books.some((b) => b.analysis?.status === "pending" || b.analysis?.status === "processing");
    if (!hasPending) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [books, subjectId]);

  async function handleUpload(bookType: BookType, file: File) {
    setUploadingType(bookType);
    setError(null);
    try {
      await api.adminUploadSubjectBook(subjectId, bookType, file);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر رفع الكتاب");
    } finally {
      setUploadingType(null);
    }
  }

  function bookFor(bookType: BookType) {
    return books.find((b) => b.bookType === bookType);
  }

  return (
    <div className="mt-4 border-t border-[#eef1f6] pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#526078]"><BookOpen size={14} /> الكتب</p>
      {error && <p role="alert" className="admin-error mb-2">{error}</p>}
      <div className="space-y-2">
        {BOOK_TYPES.map((bookType) => {
          const book = bookFor(bookType);
          const status = book?.analysis?.status;
          return (
            <div key={bookType} className="flex items-center justify-between gap-2 rounded-lg border border-[#eef1f6] px-3 py-2">
              <span className="text-xs font-bold text-[#33415c]">{BOOK_TYPE_LABELS[bookType]}</span>
              <div className="flex items-center gap-2">
                {status === "pending" || status === "processing" ? (
                  <AdminStatusBadge label="قيد التحليل" tone="warning" />
                ) : status === "completed" ? (
                  <button type="button" className="text-xs font-bold text-[#1565d8] hover:underline" onClick={() => setViewingAnalysis(book!)}>
                    {book!.analysis?.importedAt ? "مراجعة/استيراد مجددًا" : "مراجعة واستيراد"}
                  </button>
                ) : status === "failed" ? (
                  <AdminStatusBadge label="فشل التحليل" tone="danger" />
                ) : book ? (
                  <span className="text-[10px] text-[#9aa6b8]">لم يبدأ التحليل بعد</span>
                ) : (
                  <span className="text-[10px] text-[#9aa6b8]">لا يوجد</span>
                )}

                <input
                  ref={(el) => { fileInputs.current[bookType] = el; }}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(bookType, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputs.current[bookType]?.click()}
                  disabled={uploadingType === bookType}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe6f1] text-[#526078] hover:border-[#9eb7dc] hover:text-[#1565d8] disabled:opacity-50"
                  title={book ? "استبدال الملف" : "رفع الملف"}
                  aria-label={book ? `استبدال ${BOOK_TYPE_LABELS[bookType]}` : `رفع ${BOOK_TYPE_LABELS[bookType]}`}
                >
                  {uploadingType === bookType ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {viewingAnalysis && (
        <BookAnalysisReviewModal
          subjectId={subjectId}
          book={viewingAnalysis}
          bookTypeLabel={BOOK_TYPE_LABELS[viewingAnalysis.bookType]}
          onClose={() => setViewingAnalysis(null)}
          onImported={load}
        />
      )}
    </div>
  );
}
