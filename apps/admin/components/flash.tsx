export function Flash({ mesaj, hata }: { mesaj?: string | undefined; hata?: string | undefined }) {
  if (!mesaj && !hata) return null;
  return (
    <div role="status" className={`flash ${hata ? 'flash-error' : 'flash-success'}`}>
      {hata ?? mesaj}
    </div>
  );
}
