"use client";

import { useEffect, useState } from "react";
import { Flag, Globe, Mail, RefreshCw, Save, Upload } from "lucide-react";
import type { AdminFeatureFlag, AdminSiteSettings, UpdateSiteSettingsInput } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { api } from "@/lib/api";
import { AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

const FLAG_LABELS: Record<string, string> = {
  alemancenter_ad_lesson: "إعلان داخل الدرس على موقع الإيمان",
  alemancenter_ad_homepage: "بطاقة الصفحة الرئيسية على موقع الإيمان",
  ai_content_assist: "مساعدة الذكاء الاصطناعي في إنتاج المحتوى",
  achievements_visual_effects: "المؤثرات البصرية للإنجازات",
};

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [rollouts, setRollouts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListFeatureFlags()
      .then((items) => {
        setFlags(items);
        setRollouts(Object.fromEntries(items.map((flag) => [flag.key, flag.rolloutPercentage])));
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب إعدادات الميزات"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function updateFlag(flag: AdminFeatureFlag, input: { isEnabled?: boolean; rolloutPercentage?: number }) {
    setBusyKey(flag.key);
    setError(null);
    try {
      await api.adminUpdateFeatureFlag(flag.key, input);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تحديث الميزة");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveRollout(flag: AdminFeatureFlag) {
    const value = rollouts[flag.key];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("نسبة الإطلاق يجب أن تكون بين 0 و100");
      return;
    }
    await updateFlag(flag, { rolloutPercentage: Math.round(value) });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="إعدادات النظام"
        title="التحكم والأمان"
        description="أعلام الميزات ونسب الإطلاق تُقرأ من قاعدة البيانات وتؤثر في الواجهات التي تستخدمها مباشرة."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <SiteSettingsSection />

      <section className="admin-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e7ecf3] bg-[#f8faff] p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"><Flag size={20} /></span>
          <div>
            <h2 className="font-black text-[#12213f]">أعلام الميزات</h2>
            <p className="mt-1 text-xs text-[#64718a]">التفعيل والنسبة يحفظان عبر API الإدارة.</p>
          </div>
        </div>

        <div className="admin-divider-list">
          {flags.map((flag) => {
            const rolloutChanged = rollouts[flag.key] !== flag.rolloutPercentage;
            return (
              <article key={flag.key} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-[#12213f]">{FLAG_LABELS[flag.key] ?? flag.key}</h3>
                    <AdminStatusBadge label={flag.isEnabled ? "مفعّلة" : "متوقفة"} tone={flag.isEnabled ? "success" : "neutral"} />
                  </div>
                  {flag.description && <p className="mt-2 text-sm leading-6 text-[#64718a]">{flag.description}</p>}
                  <code dir="ltr" className="mt-2 block w-fit rounded-md bg-[#f0f3f7] px-2 py-1 text-xs text-[#64718a]">{flag.key}</code>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor={`rollout-${flag.key}`} className="text-xs font-black text-[#526078]">نسبة الإطلاق</label>
                  <div className="relative">
                    <input
                      id={`rollout-${flag.key}`}
                      type="number"
                      min={0}
                      max={100}
                      className="w-24 pl-8"
                      value={rollouts[flag.key] ?? 0}
                      onChange={(event) => setRollouts((current) => ({ ...current, [flag.key]: Number(event.target.value) }))}
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#7b879c]">%</span>
                  </div>
                  {rolloutChanged && (
                    <button
                      type="button"
                      onClick={() => void saveRollout(flag)}
                      disabled={busyKey === flag.key}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"
                      aria-label={`حفظ نسبة ${FLAG_LABELS[flag.key] ?? flag.key}`}
                    >
                      <Save size={17} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busyKey === flag.key}
                  onClick={() => void updateFlag(flag, { isEnabled: !flag.isEnabled })}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${flag.isEnabled ? "bg-[#159b72]" : "bg-[#c6cfdb]"}`}
                  aria-pressed={flag.isEnabled}
                  aria-label={`تبديل ${FLAG_LABELS[flag.key] ?? flag.key}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${flag.isEnabled ? "right-6" : "right-1"}`} />
                </button>
              </article>
            );
          })}
          {flags.length === 0 && !loading && <p className="p-5 text-sm text-[#64718a]">لا توجد أعلام ميزات معرفة.</p>}
        </div>
      </section>

      <ChangePasswordForm />
    </div>
  );
}

const EMPTY_SETTINGS_FORM: UpdateSiteSettingsInput = {
  siteName: "",
  tagline: "",
  contactEmail: "",
  supportEmail: "",
  socialFacebook: "",
  socialTwitter: "",
  socialInstagram: "",
  socialYoutube: "",
  socialWhatsapp: "",
  smtpEnabled: false,
  smtpHost: "",
  smtpPort: "",
  smtpUser: "",
  smtpPass: "",
  smtpFromName: "",
  smtpFromEmail: "",
};

function SiteSettingsSection() {
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [form, setForm] = useState<UpdateSiteSettingsInput>(EMPTY_SETTINGS_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .adminGetSiteSettings()
      .then((data) => {
        setSettings(data);
        setForm({
          siteName: data.siteName ?? "",
          tagline: data.tagline ?? "",
          contactEmail: data.contactEmail ?? "",
          supportEmail: data.supportEmail ?? "",
          socialFacebook: data.socialFacebook ?? "",
          socialTwitter: data.socialTwitter ?? "",
          socialInstagram: data.socialInstagram ?? "",
          socialYoutube: data.socialYoutube ?? "",
          socialWhatsapp: data.socialWhatsapp ?? "",
          smtpEnabled: data.smtpEnabled,
          smtpHost: data.smtpHost ?? "",
          smtpPort: data.smtpPort ?? "",
          smtpUser: data.smtpUser ?? "",
          smtpPass: "",
          smtpFromName: data.smtpFromName ?? "",
          smtpFromEmail: data.smtpFromEmail ?? "",
        });
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب إعدادات الموقع"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function field(key: keyof UpdateSiteSettingsInput, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.siteName || !form.siteName.trim()) {
      setError("اسم الموقع لا يمكن أن يكون فارغًا");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateSiteSettingsInput = { ...form };
      if (!payload.smtpPass) delete payload.smtpPass; // فارغ = لا تغيّر كلمة المرور المخزَّنة
      await api.adminUpdateSiteSettings(payload);
      setSavedAt(Date.now());
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: "logo" | "favicon", file: File) {
    setUploading(kind);
    setError(null);
    try {
      if (kind === "logo") await api.adminUploadLogo(file);
      else await api.adminUploadFavicon(file);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر رفع الملف");
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="admin-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#e7ecf3] bg-[#f8faff] p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"><Globe size={20} /></span>
        <div>
          <h2 className="font-black text-[#12213f]">هوية الموقع</h2>
          <p className="mt-1 text-xs text-[#64718a]">الاسم والشعار والعنوان تنعكس فورًا على كل صفحات الواجهة الأمامية.</p>
        </div>
      </div>

      {loading ? (
        <p className="p-5 text-sm text-[#64718a]">جارٍ التحميل...</p>
      ) : (
        <div className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#12213f]">
              اسم الموقع
              <input
                className="mt-1 w-full"
                value={form.siteName ?? ""}
                onChange={(e) => field("siteName", e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              العنوان الفرعي (Tagline)
              <input
                className="mt-1 w-full"
                value={form.tagline ?? ""}
                onChange={(e) => field("tagline", e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold text-[#12213f]">الشعار</p>
              <div className="flex items-center gap-3">
                {settings?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logoUrl} alt="الشعار" className="h-12 w-12 rounded-lg border border-[#e7ecf3] object-cover" />
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#c6cfdb] px-3 py-2 text-xs font-bold text-[#526078] hover:bg-[#f8faff]">
                  <Upload size={15} />
                  {uploading === "logo" ? "جارٍ الرفع..." : "رفع شعار جديد"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === "logo"}
                    onChange={(e) => e.target.files?.[0] && void upload("logo", e.target.files[0])}
                  />
                </label>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-[#12213f]">أيقونة المتصفح (Favicon)</p>
              <div className="flex items-center gap-3">
                {settings?.faviconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.faviconUrl} alt="الأيقونة" className="h-12 w-12 rounded-lg border border-[#e7ecf3] object-cover" />
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#c6cfdb] px-3 py-2 text-xs font-bold text-[#526078] hover:bg-[#f8faff]">
                  <Upload size={15} />
                  {uploading === "favicon" ? "جارٍ الرفع..." : "رفع أيقونة جديدة"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === "favicon"}
                    onChange={(e) => e.target.files?.[0] && void upload("favicon", e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#12213f]">
              البريد الإلكتروني للتواصل
              <input
                className="mt-1 w-full"
                value={form.contactEmail ?? ""}
                onChange={(e) => field("contactEmail", e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              بريد الدعم الفني
              <input
                className="mt-1 w-full"
                value={form.supportEmail ?? ""}
                onChange={(e) => field("supportEmail", e.target.value)}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-[#12213f]">روابط التواصل الاجتماعي</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input placeholder="فيسبوك" dir="ltr" value={form.socialFacebook ?? ""} onChange={(e) => field("socialFacebook", e.target.value)} />
              <input placeholder="تويتر / X" dir="ltr" value={form.socialTwitter ?? ""} onChange={(e) => field("socialTwitter", e.target.value)} />
              <input placeholder="إنستغرام" dir="ltr" value={form.socialInstagram ?? ""} onChange={(e) => field("socialInstagram", e.target.value)} />
              <input placeholder="يوتيوب" dir="ltr" value={form.socialYoutube ?? ""} onChange={(e) => field("socialYoutube", e.target.value)} />
              <input placeholder="واتساب" dir="ltr" value={form.socialWhatsapp ?? ""} onChange={(e) => field("socialWhatsapp", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {savedAt && <span className="text-xs font-bold text-[#159b72]">تم الحفظ.</span>}
            <Button onClick={() => void save()} disabled={saving} className="mr-auto">
              <Save size={16} /> {saving ? "جارٍ الحفظ..." : "حفظ هوية الموقع"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-y border-[#e7ecf3] bg-[#f8faff] p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"><Mail size={20} /></span>
        <div>
          <h2 className="font-black text-[#12213f]">البريد الصادر (SMTP)</h2>
          <p className="mt-1 text-xs text-[#64718a]">
            يُستخدم لإرسال رسائل التفعيل واستعادة كلمة المرور. عند التعطيل تُسجَّل الرسائل في سجلات الخادم فقط (وضع تطوير).
          </p>
        </div>
      </div>

      {!loading && (
        <div className="space-y-4 p-5">
          <button
            type="button"
            onClick={() => field("smtpEnabled", !form.smtpEnabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${form.smtpEnabled ? "bg-[#159b72]" : "bg-[#c6cfdb]"}`}
            aria-pressed={!!form.smtpEnabled}
            aria-label="تفعيل إرسال البريد عبر SMTP"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${form.smtpEnabled ? "right-6" : "right-1"}`} />
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#12213f]">
              خادم SMTP
              <input dir="ltr" className="mt-1 w-full" value={form.smtpHost ?? ""} onChange={(e) => field("smtpHost", e.target.value)} placeholder="smtp.example.com" />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              المنفذ
              <input dir="ltr" className="mt-1 w-full" value={form.smtpPort ?? ""} onChange={(e) => field("smtpPort", e.target.value)} placeholder="587" />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              اسم المستخدم
              <input dir="ltr" className="mt-1 w-full" value={form.smtpUser ?? ""} onChange={(e) => field("smtpUser", e.target.value)} />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              كلمة المرور {settings?.smtpPassSet && <span className="text-[#159b72]">(مضبوطة — اتركها فارغة للإبقاء عليها)</span>}
              <input
                dir="ltr"
                type="password"
                className="mt-1 w-full"
                value={form.smtpPass ?? ""}
                onChange={(e) => field("smtpPass", e.target.value)}
                placeholder={settings?.smtpPassSet ? "••••••••" : ""}
              />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              اسم المرسل
              <input className="mt-1 w-full" value={form.smtpFromName ?? ""} onChange={(e) => field("smtpFromName", e.target.value)} />
            </label>
            <label className="block text-sm font-bold text-[#12213f]">
              بريد المرسل
              <input dir="ltr" className="mt-1 w-full" value={form.smtpFromEmail ?? ""} onChange={(e) => field("smtpFromEmail", e.target.value)} />
            </label>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              <Save size={16} /> {saving ? "جارٍ الحفظ..." : "حفظ إعدادات البريد"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
