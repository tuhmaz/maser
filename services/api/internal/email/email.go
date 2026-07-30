// Package email يرسل بريدًا عبر SMTP بإعدادات بيئة (docs/security-requirements.md:
// الأسرار في ملفات بيئة مؤمَّنة، لا في الكود). إن لم يُضبط SMTP_HOST يُسجَّل
// البريد في السجلات فقط (وضع تطوير آمن) بدل الفشل الصامت أو تعطيل الميزة.
package email

import (
	"fmt"
	"log"
	"net/smtp"
)

type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

type Sender struct {
	cfg Config
}

func NewSender(cfg Config) *Sender {
	return &Sender{cfg: cfg}
}

func (s *Sender) configured() bool {
	return s.cfg.Host != "" && s.cfg.From != ""
}

// Send يرسل رسالة نصية بسيطة. لا يعيد خطأ للمستدعي في وضع التطوير غير المُهيَّأ
// حتى لا يكشف للمستخدم ما إذا كان بريده مسجَّلًا أم لا (docs/api-contract.md).
func (s *Sender) Send(to, subject, body string) error {
	if !s.configured() {
		log.Printf("[email:dev-mode] إلى=%s الموضوع=%q\n%s", to, subject, body)
		return nil
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.cfg.From, to, subject, body)

	addr := s.cfg.Host + ":" + s.cfg.Port
	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}
	if err := smtp.SendMail(addr, auth, s.cfg.From, []string{to}, []byte(msg)); err != nil {
		log.Printf("فشل إرسال البريد إلى %s: %v", to, err)
		return err
	}
	return nil
}

func (s *Sender) SendPasswordReset(to, resetURL string) error {
	body := fmt.Sprintf(
		"مرحبًا،\n\nطلبت استعادة كلمة المرور لحسابك في Alemedu.\nاضغط الرابط التالي خلال ساعة واحدة لتعيين كلمة مرور جديدة:\n\n%s\n\nإن لم تطلب هذا، تجاهل هذه الرسالة.",
		resetURL,
	)
	return s.Send(to, "استعادة كلمة المرور — Alemedu", body)
}
