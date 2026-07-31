package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/endpoints"
	"golang.org/x/oauth2/google"

	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/service"
)

// OAuthHandler يجهّز تسجيل الدخول عبر Google/Facebook — البنية كاملة وتعمل
// فور ضبط بيانات اعتماد تطبيق حقيقية في GOOGLE_CLIENT_ID/SECRET أو
// FACEBOOK_CLIENT_ID/SECRET؛ بدونها يعيد الخادم خطأ واضح بدل الانهيار.
type OAuthHandler struct {
	cfg  *config.Config
	auth *service.AuthService
}

func NewOAuthHandler(cfg *config.Config, auth *service.AuthService) *OAuthHandler {
	return &OAuthHandler{cfg: cfg, auth: auth}
}

func (h *OAuthHandler) providerConfig(provider string) *oauth2.Config {
	switch provider {
	case "google":
		if h.cfg.GoogleClientID == "" {
			return nil
		}
		return &oauth2.Config{
			ClientID: h.cfg.GoogleClientID, ClientSecret: h.cfg.GoogleClientSecret,
			RedirectURL: h.cfg.GoogleRedirectURL, Endpoint: google.Endpoint,
			Scopes: []string{"openid", "email", "profile"},
		}
	case "facebook":
		if h.cfg.FacebookClientID == "" {
			return nil
		}
		return &oauth2.Config{
			ClientID: h.cfg.FacebookClientID, ClientSecret: h.cfg.FacebookClientSecret,
			RedirectURL: h.cfg.FacebookRedirectURL, Endpoint: endpoints.Facebook,
			Scopes: []string{"email", "public_profile"},
		}
	default:
		return nil
	}
}

// Start يوجّه المتصفح لصفحة موافقة المزوّد. state عشوائي يُخزَّن في كوكي قصيرة
// العمر ويُقارَن عند العودة لمنع CSRF على تدفق OAuth.
func (h *OAuthHandler) Start(c *fiber.Ctx) error {
	provider := c.Params("provider")
	oc := h.providerConfig(provider)
	if oc == nil {
		return errorPage(c, "تسجيل الدخول عبر "+arabicProviderName(provider)+" غير مفعَّل على هذا الخادم بعد.")
	}

	state, err := randomState()
	if err != nil {
		return errorPage(c, "تعذّر بدء عملية تسجيل الدخول")
	}
	c.Cookie(&fiber.Cookie{
		Name: "oauth_state", Value: state, HTTPOnly: true, SameSite: "Lax",
		Expires: time.Now().Add(10 * time.Minute), Path: "/",
	})

	return c.Redirect(oc.AuthCodeURL(state, oauth2.AccessTypeOnline), fiber.StatusFound)
}

type providerUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	EmailVerified bool
}

// Callback يستبدل الرمز، يجلب هوية المستخدم من المزوّد، وينشئ/يربط الحساب،
// ثم يخزّن رمز التحديث في كوكي HttpOnly ويعيد التوجيه لصفحة الواجهة بلا أي
// معامل استعلام. سابقًا كانت الرموز تُمرَّر داخل رابط إعادة التوجيه نفسه، ما
// يعرّضها للتسريب عبر سجلات الخادم/المتصفح أو ترويسة Referer — لم يعد هناك
// أي رمز في الرابط إطلاقًا الآن؛ صفحة oauth-callback تستدعي /auth/refresh
// (الكوكي تُرسَل تلقائيًا) لتحصل على رمز وصول وتعرف حالة الدخول.
func (h *OAuthHandler) Callback(c *fiber.Ctx) error {
	provider := c.Params("provider")
	oc := h.providerConfig(provider)
	if oc == nil {
		return errorPage(c, "تسجيل الدخول عبر "+arabicProviderName(provider)+" غير مفعَّل على هذا الخادم بعد.")
	}

	state := c.Cookies("oauth_state")
	if state == "" || state != c.Query("state") {
		return errorPage(c, "انتهت صلاحية جلسة تسجيل الدخول، حاول مجددًا")
	}
	code := c.Query("code")
	if code == "" {
		return errorPage(c, "تعذّر إكمال تسجيل الدخول")
	}

	token, err := oc.Exchange(c.Context(), code)
	if err != nil {
		return errorPage(c, "تعذّر تبادل رمز الدخول مع "+arabicProviderName(provider))
	}

	info, err := fetchUserInfo(provider, oc, token)
	if err != nil || info.Email == "" {
		return errorPage(c, "تعذّر جلب بيانات حسابك من "+arabicProviderName(provider))
	}
	// Facebook Graph API لا يعيد حقل email أصلًا إلا إن كان موثَّقًا، أما جوجل
	// فيصرّح صراحةً عبر email_verified — يجب رفض الربط ببريد غير موثَّق من
	// المزوّد حتى لا يُربَط/يُنشأ حساب ببريد شخص آخر لم يثبت ملكيته له.
	if provider == "google" && !info.EmailVerified {
		return errorPage(c, "بريدك الإلكتروني في جوجل غير موثَّق — وثّقه أولًا ثم أعد المحاولة")
	}
	displayName := info.Name
	if displayName == "" {
		displayName = strings.Split(info.Email, "@")[0]
	}

	result, err := h.auth.FindOrCreateFromOAuth(c.Context(), provider, info.ID, info.Email, displayName,
		string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		return errorPage(c, "تعذّر إنشاء أو ربط الحساب")
	}

	setRefreshCookie(c, h.cfg, result.RefreshToken)
	dest := strings.TrimSuffix(h.cfg.WebBaseURL, "/") + "/oauth-callback"
	return c.Redirect(dest, fiber.StatusFound)
}

func fetchUserInfo(provider string, oc *oauth2.Config, token *oauth2.Token) (*providerUserInfo, error) {
	client := oc.Client(context.Background(), token)
	var url string
	switch provider {
	case "google":
		url = "https://www.googleapis.com/oauth2/v3/userinfo"
	case "facebook":
		url = "https://graph.facebook.com/me?fields=id,name,email"
	}
	res, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		// err ما زال nil هنا (لا خطأ نقل) — لولا هذا الخطأ الصريح لعاد
		// المستدعي (Callback) بـ nil, nil ويصطدم لاحقًا بـ info.Email على
		// مؤشر nil (panic) بدل صفحة خطأ نظيفة.
		return nil, fmt.Errorf("provider returned status %d", res.StatusCode)
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	var raw struct {
		Sub, ID, Email, Name string
		EmailVerified        bool `json:"email_verified"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	id := raw.Sub
	if id == "" {
		id = raw.ID
	}
	return &providerUserInfo{ID: id, Email: raw.Email, Name: raw.Name, EmailVerified: raw.EmailVerified}, nil
}

func randomState() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func arabicProviderName(provider string) string {
	if provider == "google" {
		return "جوجل"
	}
	if provider == "facebook" {
		return "فيسبوك"
	}
	return provider
}

// errorPage صفحة HTML بسيطة (بدل JSON) لأن هذا مسار تنقّل متصفح مباشر، لا استدعاء API.
// الرسالة تُهرَّب دائمًا (html.EscapeString) — provider يأتي من مسار URL خام
// (:provider) وقد يحتوي HTML/JS إن لم يكن "google"/"facebook" (Reflected XSS
// محتمل بدون هذا التهريب — راجع arabicProviderName).
func errorPage(c *fiber.Ctx, message string) error {
	c.Type("html")
	return c.Status(fiber.StatusBadGateway).SendString(
		`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:sans-serif;padding:2rem;text-align:center">` +
			`<p>` + html.EscapeString(message) + `</p></body></html>`,
	)
}
