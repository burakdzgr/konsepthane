'use client';

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const sessionLost = error.name === 'AdminSessionError' || /oturum/i.test(error.message);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-[.15em] text-[var(--accent)]">
        {sessionLost ? 'Oturum' : 'Hata'}
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        {sessionLost ? 'Oturumun sona erdi' : 'Bir şeyler ters gitti'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {sessionLost
          ? 'Güvenlik için yönetim oturumu sonlandırıldı. Yeniden giriş yaparak kaldığın yerden devam edebilirsin.'
          : 'İşlem güvenli biçimde durduruldu. Yeniden deneyin; sorun sürerse denetim ve sunucu loglarını istek zamanıyla birlikte kontrol edin.'}
      </p>
      {!sessionLost && error.digest && (
        <p className="mt-2 font-mono text-xs text-[var(--muted)]">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        {sessionLost ? (
          <a
            href="/admin/giris?hata=oturum"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Giriş yap
          </a>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Yeniden dene
          </button>
        )}
      </div>
    </div>
  );
}
