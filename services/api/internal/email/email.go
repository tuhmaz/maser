// Package email يرسل بريدًا عبر SMTP. الإعدادات تأتي من قاعدة البيانات
// (site_settings — قابلة للتعديل من لوحة الإدارة) مع سقوط احتياطي لمتغيرات
// البيئة SMTP_* إن كانت قاعدة البيانات فارغة أو "smtp_enabled" معطَّلة. إن لم
// يتوفر أي منهما يُسجَّل البريد في السجلات فقط (وضع تطوير آمن) بدل الفشل الصامت.
package email

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
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

func stripCRLF(v string) string {
	v = strings.ReplaceAll(v, "\r", "")
	v = strings.ReplaceAll(v, "\n", "")
	return v
}

// Send يرسل رسالة نصية بسيطة. لا يعيد خطأ للمستدعي في وضع التطوير غير المُهيَّأ
// حتى لا يكشف للمستخدم ما إذا كان بريده مسجَّلًا أم لا (docs/api-contract.md).
func (s *Sender) Send(to, subject, body string) error {
	if !s.configured() {
		log.Printf("[email:dev-mode] إلى=%s الموضوع=%q\n%s", to, subject, body)
		return nil
	}

	// دفاع إضافي بعمق: حتى مع تحقق صيغة البريد عند الإدخال (utils.IsValidEmail)،
	// أي CR/LF داخل هذه الحقول قد يُستغَل لحقن ترويسات بريد إضافية (Bcc/Cc
	// مزيّفة). التحقق هنا يبقى صحيحًا حتى لو تغيّر مصدر البيانات مستقبلًا.
	to = stripCRLF(to)
	subject = stripCRLF(subject)
	fromName := stripCRLF(s.cfg.FromName)
	fromAddr := stripCRLF(s.cfg.From)

	from := fromAddr
	if fromName != "" {
		from = fmt.Sprintf("%s <%s>", fromName, fromAddr)
	}
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, to, subject, body)

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
		"مرحبًا،\n\nطلبت استعادة كلمة المرور لحسابك.\nاضغط الرابط التالي خلال ساعة واحدة لتعيين كلمة مرور جديدة:\n\n%s\n\nإن لم تطلب هذا، تجاهل هذه الرسالة.",
		resetURL,
	)
	return s.Send(to, "استعادة كلمة المرور", body)
}

func (s *Sender) SendVerification(to, verifyURL string) error {
	body := fmt.Sprintf(
		"مرحبًا،\n\nلتفعيل بريدك الإلكتروني اضغط الرابط التالي:\n\n%s\n\nإن لم تنشئ هذا الحساب، تجاهل هذه الرسالة.",
		verifyURL,
	)
	return s.Send(to, "تفعيل البريد الإلكتروني", body)
}

// FromDB يبني Sender من إعدادات site_settings إن كانت مفعّلة (smtp_enabled)
// ومكتملة (host غير فارغ)، وإلا يسقط احتياطيًا إلى fallback (متغيرات البيئة).
// يُستدعى عند كل إرسال حتى تُطبَّق تغييرات لوحة الإدارة فورًا دون إعادة تشغيل الخادم.
func FromDB(ctx context.Context, db *pgxpool.Pool, fallback Config) *Sender {
	var enabled bool
	var host, port, user, pass, fromName, fromEmail *string

	err := db.QueryRow(ctx, `
		SELECT smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email
		FROM site_settings WHERE id = 1
	`).Scan(&enabled, &host, &port, &user, &pass, &fromName, &fromEmail)
	if err != nil && err != pgx.ErrNoRows {
		log.Printf("تعذّرت قراءة إعدادات البريد من قاعدة البيانات، استُخدم الإعداد الاحتياطي: %v", err)
	}

	if err == nil && enabled && host != nil && *host != "" {
		cfg := Config{
			Host: *host, Port: deref(port, "587"), Username: deref(user, ""),
			Password: deref(pass, ""), From: deref(fromEmail, fallback.From), FromName: deref(fromName, fallback.FromName),
		}
		return NewSender(cfg)
	}
	return NewSender(fallback)
}

func deref(p *string, fallback string) string {
	if p == nil || *p == "" {
		return fallback
	}
	return *p
}
