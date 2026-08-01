// Package ai يوفر عميلًا لمزوّد AI واحد (Together AI) — قرار الخارطة
// docs/ai-curriculum-roadmap.md: "لا تعدد مزوّدين من اليوم الأول". Together
// يوفر واجهة متوافقة مع OpenAI تقبل أسماء نماذج متعددة لنفس الحساب، فيلبي هذا
// عمليًا رغبة تعدد النماذج دون تعقيد تكامل مزوّدين مختلفين.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const togetherChatCompletionsURL = "https://api.together.xyz/v1/chat/completions"

type TogetherClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewTogetherClient(apiKey string) *TogetherClient {
	return &TogetherClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionRequest struct {
	Model          string         `json:"model"`
	Messages       []chatMessage  `json:"messages"`
	ResponseFormat map[string]any `json:"response_format,omitempty"`
	Temperature    float64        `json:"temperature"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete يرسل رسالتي نظام/مستخدم إلى Together AI ويعيد نص الرد الخام
// (فك تسلسل JSON المتوقَّع داخله مسؤولية المستدعي، ليست مسؤولية هذه الحزمة).
// يطلب إخراج JSON صراحةً عبر response_format، لكن لا يضمن أن كل نموذج يلتزم
// بذلك تمامًا — المستدعي يجب أن يتعامل بحذر مع فشل فك التسلسل.
func (c *TogetherClient) Complete(ctx context.Context, model, systemPrompt, userPrompt string) (string, error) {
	body, err := json.Marshal(chatCompletionRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		ResponseFormat: map[string]any{"type": "json_object"},
		Temperature:    0.7,
	})
	if err != nil {
		return "", fmt.Errorf("تعذّر تجهيز الطلب: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, togetherChatCompletionsURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("تعذّر إنشاء الطلب: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("تعذّر الاتصال بمزوّد AI: %w", err)
	}
	defer res.Body.Close()

	respBody, err := io.ReadAll(res.Body)
	if err != nil {
		return "", fmt.Errorf("تعذّر قراءة رد مزوّد AI: %w", err)
	}

	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("مزوّد AI أعاد الحالة %d", res.StatusCode)
	}

	var parsed chatCompletionResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("تعذّر تحليل رد مزوّد AI: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("مزوّد AI أعاد خطأ: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("مزوّد AI لم يُعِد أي رد")
	}

	return parsed.Choices[0].Message.Content, nil
}
