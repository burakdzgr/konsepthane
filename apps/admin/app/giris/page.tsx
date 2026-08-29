import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { login } from '@/lib/api';
import { formString } from '@/lib/form';

async function loginAction(formData: FormData) {
  'use server';
  const email = formString(formData, 'email');
  const password = formString(formData, 'password');
  let failure: string | null = null;
  try {
    await login(email, password);
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Giriş yapılamadı.';
  }
  if (failure) redirect(`/giris?hata=${encodeURIComponent(failure)}`);
  redirect('/');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const message =
    hata === 'oturum' ? 'Oturum süresi doldu, lütfen yeniden giriş yapın.' : (hata ?? undefined);
  return (
    <main className="admin-login-shell">
      <section className="admin-login-intro">
        <p className="admin-eyebrow">Konsepthane yönetim merkezi</p>
        <h1>İçeriği üretin, topluluğu koruyun.</h1>
        <p>
          Editoryal yayın, moderasyon ve erişim yönetimi birbirinden ayrılmış yetkilerle çalışır.
          Hesabınız yalnızca görev alanınıza ait ekranları görür.
        </p>
        <ul>
          <li>Her istekte güncel rol ve yetki doğrulaması</li>
          <li>Tek kullanımlı oturum yenileme ve güvenli çıkış</li>
          <li>Yönetim işlemlerinde denetim izi</li>
        </ul>
      </section>
      <Card className="admin-login-card">
        <img
          src="/admin/brand/konsepthane-logo.png?v=2"
          alt="Konsepthane"
          width="1901"
          height="509"
          className="admin-login-logo"
        />
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Güvenli giriş</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          İçerik, yayın ve moderasyon iş akışlarını yönetin. Yalnızca editör, moderatör ve yönetici
          hesapları giriş yapabilir.
        </p>
        <div className="mt-5">
          <Flash hata={message} />
        </div>
        <form action={loginAction} className="mt-2 grid gap-5">
          <label>
            E-posta veya kullanıcı adı
            <Input name="email" type="text" autoComplete="username" required />
          </label>
          <label>
            Parola
            <Input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Button type="submit">Güvenli giriş</Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Oturum bilgileri yalnızca HttpOnly çerezlerde tutulur. Başarısız denemeler hız sınırına
          tabidir ve panel arama motorlarına kapalıdır.
        </p>
      </Card>
    </main>
  );
}
