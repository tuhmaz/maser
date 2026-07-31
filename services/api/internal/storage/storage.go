package storage

import "mime/multipart"

// Storage يخزّن ملفًا مرفوعًا تحت مسار نسبي (relPath، بلا شرطة مائلة بادئة)
// ويعيد الرابط العام الكامل للوصول إليه. التنفيذ المحلي (Local) يكتب على
// القرص؛ أي تنفيذ S3 لاحق (اختياري، docs/ai-curriculum-roadmap.md — E03) يرفع
// إلى Bucket بنفس العقد دون تغيير أي مستدعٍ حالي.
type Storage interface {
	Save(fh *multipart.FileHeader, relPath string) (url string, err error)
}
