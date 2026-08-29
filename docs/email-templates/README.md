# E-posta şablonları (Brevo import)

Kaynak: `apps/api/src/common/email-template.ts` (tek gerçek kaynak; API doğrulama ve parola
sıfırlama e-postalarını buradan üretir). Bu klasördeki dosyalar aynı şablonun Brevo'ya
**Templates → New template → Import HTML** ile yüklenebilecek, `{{ params.* }}` değişkenli
sürümleridir.

| Dosya | Brevo params |
| --- | --- |
| `brevo-email-verification.html` | `cta_url`, `display_name`, `social_instagram`, `social_pinterest`, `social_linkedin`, `year` |
| `brevo-password-reset.html` | aynı |
| `brevo-otp-code.html` | `verification_code`, `expires_minutes`, `cta_url`, `display_name`, sosyal linkler, `year` |

Görseller `https://konsepthane.net/brand/email/logo-640.png` ve `https://konsepthane.net/brand/social/*.png`
adreslerinden yüklenir; site yayında olmadan Brevo önizlemesinde görseller kırık görünür (Brevo'nun
kendi görsel kütüphanesine yükleyip URL'leri değiştirmek de mümkündür). Font: Poppins (Apple Mail,
iOS Mail, Outlook macOS web font gösterir; Gmail/Outlook Windows Arial'a düşer).
