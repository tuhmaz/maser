// Package gemini يوفر عميلًا لتحليل ملفات PDF عبر Gemini File API (فهم
// مستندي أصلي — يقرأ الملف كاملًا، لا استخراج نص محلي مسبق). يُستخدَم حصرًا
// من معالج analyze_book في services/worker؛ توليد الأسئلة (E04) يبقى على
// Together AI (libs/togetherai) كما هو — لا علاقة بين الاثنين.
package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	uploadBaseURL = "https://generativelanguage.googleapis.com/upload/v1beta/files"
	apiBaseURL    = "https://generativelanguage.googleapis.com/v1beta"
)

type GeminiClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewGeminiClient(apiKey string) *GeminiClient {
	return &GeminiClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

// AnalyzePDF يرفع ملف PDF إلى Gemini File API، ينتظر اكتمال معالجته، ثم يطلب
// من النموذج تحليله ببرومبت النظام المُعطى. يعيد نص الرد الخام (JSON متوقَّع
// داخله — فك التسلسل مسؤولية المستدعي، بنفس فلسفة togetherai.Complete).
func (c *GeminiClient) AnalyzePDF(ctx context.Context, model string, pdfBytes []byte, systemPrompt string) (string, error) {
	fileURI, mimeType, err := c.uploadFile(ctx, pdfBytes, "book.pdf")
	if err != nil {
		return "", fmt.Errorf("تعذّر رفع الملف إلى Gemini: %w", err)
	}

	if err := c.waitUntilActive(ctx, fileURI); err != nil {
		return "", fmt.Errorf("تعذّر معالجة الملف على خوادم Gemini: %w", err)
	}

	return c.generateContent(ctx, model, fileURI, mimeType, systemPrompt)
}

// uploadFile يُنفّذ بروتوكول الرفع القابل للاستئناف (resumable) الموثَّق من
// Google لملفات File API — ضروري لملفات كبيرة (كتب PDF حتى 150MB في هذا
// المشروع، راجع maxBookUploadBytes في services/api).
func (c *GeminiClient) uploadFile(ctx context.Context, data []byte, displayName string) (fileURI, mimeType string, err error) {
	startBody, _ := json.Marshal(map[string]any{
		"file": map[string]any{"display_name": displayName},
	})

	startReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadBaseURL, bytes.NewReader(startBody))
	if err != nil {
		return "", "", err
	}
	startReq.Header.Set("x-goog-api-key", c.apiKey)
	startReq.Header.Set("Content-Type", "application/json")
	startReq.Header.Set("X-Goog-Upload-Protocol", "resumable")
	startReq.Header.Set("X-Goog-Upload-Command", "start")
	startReq.Header.Set("X-Goog-Upload-Header-Content-Length", fmt.Sprintf("%d", len(data)))
	startReq.Header.Set("X-Goog-Upload-Header-Content-Type", "application/pdf")

	startRes, err := c.httpClient.Do(startReq)
	if err != nil {
		return "", "", fmt.Errorf("فشل بدء جلسة الرفع: %w", err)
	}
	defer startRes.Body.Close()
	if startRes.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(startRes.Body)
		return "", "", fmt.Errorf("رد غير متوقَّع (%d) عند بدء الرفع: %s", startRes.StatusCode, string(body))
	}
	uploadURL := startRes.Header.Get("X-Goog-Upload-URL")
	if uploadURL == "" {
		return "", "", fmt.Errorf("لم يُعِد Gemini رابط رفع صالحًا")
	}

	uploadReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(data))
	if err != nil {
		return "", "", err
	}
	uploadReq.Header.Set("Content-Length", fmt.Sprintf("%d", len(data)))
	uploadReq.Header.Set("X-Goog-Upload-Offset", "0")
	uploadReq.Header.Set("X-Goog-Upload-Command", "upload, finalize")

	uploadRes, err := c.httpClient.Do(uploadReq)
	if err != nil {
		return "", "", fmt.Errorf("فشل رفع بيانات الملف: %w", err)
	}
	defer uploadRes.Body.Close()
	uploadBody, err := io.ReadAll(uploadRes.Body)
	if err != nil {
		return "", "", err
	}
	if uploadRes.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("رد غير متوقَّع (%d) عند رفع الملف: %s", uploadRes.StatusCode, string(uploadBody))
	}

	var parsed struct {
		File struct {
			Name     string `json:"name"`
			URI      string `json:"uri"`
			MimeType string `json:"mimeType"`
			State    string `json:"state"`
		} `json:"file"`
	}
	if err := json.Unmarshal(uploadBody, &parsed); err != nil {
		return "", "", fmt.Errorf("تعذّر تحليل رد الرفع: %w", err)
	}
	if parsed.File.URI == "" {
		return "", "", fmt.Errorf("رد الرفع لا يحوي رابط ملف")
	}
	return parsed.File.URI, parsed.File.MimeType, nil
}

// waitUntilActive يستطلع حالة الملف حتى يصبح "ACTIVE" (يبدأ عادة "PROCESSING"
// لملفات PDF كبيرة) — حد أقصى دقيقة واحدة، متوافق مع أن هذه المهمة أصلًا
// تعمل غير متزامنة داخل ai_jobs (لا ضغط على مستخدم ينتظر أمام شاشة).
func (c *GeminiClient) waitUntilActive(ctx context.Context, fileURI string) error {
	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURI, nil)
		if err != nil {
			return err
		}
		req.Header.Set("x-goog-api-key", c.apiKey)

		res, err := c.httpClient.Do(req)
		if err != nil {
			return err
		}
		body, readErr := io.ReadAll(res.Body)
		res.Body.Close()
		if readErr != nil {
			return readErr
		}
		if res.StatusCode != http.StatusOK {
			return fmt.Errorf("رد غير متوقَّع (%d) عند استعلام حالة الملف: %s", res.StatusCode, string(body))
		}

		var parsed struct {
			State string `json:"state"`
		}
		if err := json.Unmarshal(body, &parsed); err != nil {
			return err
		}
		switch parsed.State {
		case "ACTIVE":
			return nil
		case "FAILED":
			return fmt.Errorf("فشلت معالجة Gemini للملف (state=FAILED)")
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return fmt.Errorf("انتهت مهلة انتظار معالجة الملف على خوادم Gemini")
}

func (c *GeminiClient) generateContent(ctx context.Context, model, fileURI, mimeType, systemPrompt string) (string, error) {
	url := fmt.Sprintf("%s/models/%s:generateContent", apiBaseURL, model)

	reqBody, _ := json.Marshal(map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]any{
					{"file_data": map[string]string{"mime_type": mimeType, "file_uri": fileURI}},
					{"text": systemPrompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"response_mime_type": "application/json",
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-goog-api-key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("تعذّر الاتصال بـGemini: %w", err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("مزوّد AI أعاد الحالة %d: %s", res.StatusCode, string(body))
	}

	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("تعذّر تحليل رد Gemini: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("Gemini أعاد خطأ: %s", parsed.Error.Message)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini لم يُعِد أي رد")
	}
	return parsed.Candidates[0].Content.Parts[0].Text, nil
}
