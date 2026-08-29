/**
 * Transactional e-mail layout (single source of truth).
 *
 * Placeholders use Brevo's `{{ params.name }}` syntax so the very same markup can be imported
 * into Brevo as a template (see `docs/email-templates/`) or rendered here by `renderEmail()`.
 * Table-based, inline-styled, Poppins with Arial fallback (Gmail/Outlook ignore web fonts),
 * PNG assets served from the public site (`{{ params.asset_base }}/brand/…`).
 *
 * Variables: preheader, title, intro, cta_url, cta_label, note, code (optional, shows a code box),
 * signature, asset_base, site_url, social_instagram, social_pinterest, social_linkedin,
 * contact_email, year.
 */
export const EMAIL_TEMPLATE = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>{{ params.title }}</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');</style>
  <!--<![endif]-->
  <style>
    body, table, td, a { font-family: Poppins, Arial, Helvetica, sans-serif; }
    @media only screen and (max-width: 680px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .card-pad { padding: 34px 22px !important; }
      .logo { width: 220px !important; max-width: 80% !important; }
      .nav-cell { display: block !important; width: 100% !important; padding: 7px 0 !important; }
      .code { font-size: 32px !important; letter-spacing: 6px !important; }
      .headline { font-size: 26px !important; line-height: 32px !important; }
      .cta { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f7f1e9; font-family:Poppins, Arial, Helvetica, sans-serif; color:#4a3528;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">{{ params.preheader }}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f7f1e9;">
    <tr><td style="height:6px; line-height:6px; font-size:0; background:#d9684c;">&nbsp;</td></tr>
    <tr>
      <td align="center" class="px" style="padding:34px 18px 0;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" class="container" style="width:640px; max-width:640px;">

          <tr>
            <td align="center" style="padding:12px 0 8px;">
              <a href="{{ params.site_url }}" style="text-decoration:none;">
                <img src="{{ params.asset_base }}/brand/email/logo-640.png" width="280" alt="Konsepthane.net" class="logo"
                     style="display:block; width:280px; max-width:90%; height:auto; border:0; outline:none; text-decoration:none;">
              </a>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 20px 26px; font-family:Poppins, Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; font-weight:600; color:#d9684c;">
              her özel gün için bir fikir
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #e5d8ca; border-bottom:1px solid #e5d8ca;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" class="nav-cell" style="padding:15px 6px; font-size:12px; font-weight:700; letter-spacing:.6px;">
                    <a href="{{ params.site_url }}/tr/kategori/dogum-gunu" style="color:#5c4434; text-decoration:none;">DOĞUM GÜNÜ</a>
                  </td>
                  <td align="center" class="nav-cell" style="padding:15px 6px; font-size:12px; font-weight:700; letter-spacing:.6px;">
                    <a href="{{ params.site_url }}/tr/fikirler" style="color:#5c4434; text-decoration:none;">FİKİRLER</a>
                  </td>
                  <td align="center" class="nav-cell" style="padding:15px 6px; font-size:12px; font-weight:700; letter-spacing:.6px;">
                    <a href="{{ params.site_url }}/tr/deneyimler" style="color:#5c4434; text-decoration:none;">DENEYİMLER</a>
                  </td>
                  <td align="center" class="nav-cell" style="padding:15px 6px; font-size:12px; font-weight:700; letter-spacing:.6px;">
                    <a href="{{ params.site_url }}/tr/sorular" style="color:#5c4434; text-decoration:none;">SORULAR</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border:1px solid #eadfd4; border-radius:24px;">
                <tr>
                  <td align="center" class="card-pad" style="padding:46px 48px 42px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" valign="middle" style="width:74px; height:74px; background:#fbebe5; border-radius:37px; font-size:32px; line-height:74px; color:#d9684c;">&#9993;</td>
                      </tr>
                    </table>

                    <div class="headline" style="margin:28px 0 10px; font-family:Poppins, Arial, Helvetica, sans-serif; font-size:30px; line-height:38px; font-weight:800; color:#493326;">{{ params.title }}</div>

                    <div style="font-size:16px; line-height:25px; color:#614a3b; max-width:480px;">{{ params.intro }}</div>

                    {{ params.code_block }}

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                      <tr>
                        <td align="center" bgcolor="#d85f43" style="border-radius:999px;">
                          <a href="{{ params.cta_url }}" class="cta"
                             style="display:inline-block; padding:15px 34px; min-width:250px; font-family:Poppins, Arial, Helvetica, sans-serif; font-size:14px; line-height:18px; font-weight:700; letter-spacing:.4px; color:#ffffff; text-decoration:none; border-radius:999px;">{{ params.cta_label }} &nbsp;&rarr;</a>
                        </td>
                      </tr>
                    </table>

                    <div style="padding-top:18px; font-size:14px; line-height:22px; color:#5f493c;">{{ params.note }}</div>

                    <div style="padding-top:16px; font-size:12px; line-height:19px; color:#8a7264; word-break:break-all;">
                      Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br>
                      <a href="{{ params.cta_url }}" style="color:#d9684c; text-decoration:underline;">{{ params.cta_url }}</a>
                    </div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px; background:#fbf5ee; border:1px solid #ead9c9; border-radius:14px;">
                      <tr>
                        <td width="58" align="center" valign="middle" style="padding:18px 0 18px 16px;">
                          <div style="width:38px; height:38px; border-radius:19px; background:#efe0d1; line-height:38px; color:#7b624f; font-weight:700;">&#10003;</div>
                        </td>
                        <td valign="middle" style="padding:16px 18px 16px 12px; font-size:13px; line-height:20px; color:#5f493c;">
                          Bu işlemi sen başlatmadıysan bu e-postayı yok sayabilirsin; hesabında hiçbir değişiklik yapılmaz.
                        </td>
                      </tr>
                    </table>

                    <div style="padding-top:28px; font-size:15px; line-height:22px; color:#5f493c;">Sevgiler,</div>
                    <div style="padding-top:4px; font-family:Poppins, Arial, Helvetica, sans-serif; font-size:20px; line-height:28px; font-weight:700; color:#6b4b39;">{{ params.signature }}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:34px 24px 14px;">
              <div style="font-size:14px; line-height:22px; color:#684f3e;">
                Konsepthane, unutulmaz anlarını güzelleştirmek için<br>fikirler, rehberler ve gerçek deneyimler sunar.
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto 0;">
                <tr>
                  <td style="padding:0 8px;"><a href="{{ params.social_instagram }}" style="text-decoration:none;"><img src="{{ params.asset_base }}/brand/social/instagram.png" width="28" height="28" alt="Instagram" style="display:block; border:0;"></a></td>
                  <td style="padding:0 8px;"><a href="{{ params.social_pinterest }}" style="text-decoration:none;"><img src="{{ params.asset_base }}/brand/social/pinterest.png" width="28" height="28" alt="Pinterest" style="display:block; border:0;"></a></td>
                  <td style="padding:0 8px;"><a href="{{ params.social_linkedin }}" style="text-decoration:none;"><img src="{{ params.asset_base }}/brand/social/linkedin.png" width="28" height="28" alt="LinkedIn" style="display:block; border:0;"></a></td>
                </tr>
              </table>
              <div style="padding-top:18px; font-size:13px; line-height:20px;">
                <a href="mailto:{{ params.contact_email }}" style="color:#765848; text-decoration:none;">{{ params.contact_email }}</a>
              </div>
              <div style="padding-top:14px; font-size:13px; font-weight:700; letter-spacing:3px;">
                <a href="{{ params.site_url }}" style="color:#d9684c; text-decoration:none;">KONSEPTHANE.NET</a>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:18px 24px 34px; border-top:1px solid #e5d8ca; font-size:12px; line-height:19px; color:#806958;">
              Bu e-posta hesabınla ilgili otomatik bir bildirimdir; lütfen yanıtlama.<br>&copy; {{ params.year }} konsepthane.net
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/** Optional highlighted code box (OTP style); rendered only when `code` is given. */
export const CODE_BLOCK = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
  <tr>
    <td align="center" style="padding:24px 14px; border:1px dashed #e08a72; border-radius:14px; background:#fffaf7;">
      <div class="code" style="font-family:'Courier New', Courier, monospace; font-size:40px; line-height:48px; font-weight:700; letter-spacing:10px; color:#d85f43;">{{ params.code }}</div>
    </td>
  </tr>
</table>`;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );

export type EmailParams = {
  preheader: string;
  title: string;
  intro: string;
  cta_url: string;
  cta_label: string;
  note: string;
  code?: string | undefined;
  signature?: string | undefined;
};

/** Fills the Brevo-style placeholders; text values are HTML-escaped, URLs are kept as-is. */
export function renderEmail(params: EmailParams) {
  // `||` (not `??`): empty env values must fall back too.
  const siteUrl = (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
  const assetBase = (process.env.MAIL_ASSET_BASE || siteUrl).replace(/\/$/, '');
  const values: Record<string, string> = {
    preheader: escapeHtml(params.preheader),
    title: escapeHtml(params.title),
    intro: escapeHtml(params.intro),
    cta_url: params.cta_url,
    cta_label: escapeHtml(params.cta_label),
    note: escapeHtml(params.note),
    code_block: params.code ? CODE_BLOCK.replace('{{ params.code }}', escapeHtml(params.code)) : '',
    signature: escapeHtml(params.signature ?? 'Konsepthane Ekibi'),
    asset_base: assetBase,
    site_url: siteUrl,
    social_instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || siteUrl,
    social_pinterest: process.env.NEXT_PUBLIC_SOCIAL_PINTEREST || siteUrl,
    social_linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || siteUrl,
    contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@konsepthane.net',
    year: String(new Date().getFullYear()),
  };
  return EMAIL_TEMPLATE.replace(/\{\{\s*params\.(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key]! : match,
  );
}
