package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

// Local ينفّذ Storage بالكتابة على قرص محلي (rootDir)، ويبني الرابط العام من
// publicBaseURL — نفس المسار الذي يخدمه app.Static("/assets", cfg.StorageDir)
// في internal/router/router.go.
type Local struct {
	rootDir       string
	publicBaseURL string
}

func NewLocal(rootDir, publicBaseURL string) *Local {
	return &Local{rootDir: rootDir, publicBaseURL: publicBaseURL}
}

func (l *Local) Save(fh *multipart.FileHeader, relPath string) (string, error) {
	relPath = filepath.ToSlash(relPath)
	absPath := filepath.Join(l.rootDir, filepath.FromSlash(relPath))

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return "", fmt.Errorf("تعذّر تجهيز مجلد التخزين: %w", err)
	}

	src, err := fh.Open()
	if err != nil {
		return "", fmt.Errorf("تعذّر فتح الملف المرفوع: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(absPath)
	if err != nil {
		return "", fmt.Errorf("تعذّر إنشاء الملف على القرص: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("تعذّر حفظ الملف: %w", err)
	}

	return strings.TrimSuffix(l.publicBaseURL, "/") + "/" + relPath, nil
}
