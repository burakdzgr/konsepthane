import { Badge, Input, Select, TextInput } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import {
  ConfirmButton,
  CreatePanel,
  PageHeader,
  RecordCollection,
  SubmitButton,
  WorkflowHint,
} from '@/components/admin-ui';

type AdminUser = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  roles: string[];
  profile: {
    displayName: string;
    username: string | null;
    kind: 'MEMBER' | 'EDITOR';
    editorActive: boolean;
    isPublic: boolean;
  } | null;
  _count: { authoredConcepts: number; guides: number; experiences: number; questions: number };
};
type RoleRow = { key: string; name: string; _count: { users: number } };

const statusLabel: Record<string, string> = {
  ACTIVE: 'Aktif',
  PENDING_VERIFICATION: 'Doğrulama bekliyor',
  SUSPENDED: 'Askıda',
  DELETED: 'Silindi',
};

async function createUser(formData: FormData) {
  'use server';
  const roles = formData
    .getAll('roles')
    .filter((value): value is string => typeof value === 'string');
  await runAdminAction(
    '/kullanicilar',
    async () => {
      await adminApi('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: formString(formData, 'email'),
          password: formString(formData, 'password'),
          displayName: formString(formData, 'displayName'),
          username: formString(formData, 'username') || undefined,
          roles: roles.length ? roles : ['member'],
        }),
      });
    },
    'Kullanıcı oluşturuldu.',
  );
}
async function setRoles(formData: FormData) {
  'use server';
  const roles = formData
    .getAll('roles')
    .filter((value): value is string => typeof value === 'string');
  await runAdminAction(
    '/kullanicilar',
    async () => {
      await adminApi(`/users/${formString(formData, 'id')}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles }),
      });
    },
    'Roller güncellendi.',
  );
}
async function setStatus(formData: FormData) {
  'use server';
  await runAdminAction(
    '/kullanicilar',
    async () => {
      await adminApi(`/users/${formString(formData, 'id')}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: formString(formData, 'status') }),
      });
    },
    'Durum güncellendi.',
  );
}
async function softDelete(formData: FormData) {
  'use server';
  await runAdminAction(
    '/kullanicilar',
    async () => {
      await adminApi(`/users/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Hesap kapatıldı (içerik yazarlıkları korunur).',
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, users, roles] = await Promise.all([
    searchParams,
    adminApi<{ data: AdminUser[]; meta: { total: number } }>('/users?pageSize=100'),
    adminApi<RoleRow[]>('/users/roles'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Ekip ve erişim · Hesap güvenliği"
        title="Kullanıcılar"
        description="Hesap durumlarını ve rol tabanlı erişimleri yönetin. Rol değişiklikleri aktif yenileme oturumlarını iptal eder; editör profilleri ayrı ekrandan yönetilir."
      />
      <WorkflowHint
        steps={[
          'Hesabı en düşük yetki olan Üye rolüyle oluşturun.',
          'Yalnızca görev için gereken ek rolleri atayın.',
          'Erişim gerekmiyorsa hesabı silmek yerine güvenli biçimde kapatın.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <CreatePanel
        title="Yeni kullanıcı oluştur"
        description="Varsayılan rol Üye’dir; yönetim rolleri yalnızca iş ihtiyacı varsa verilmelidir."
        open={yeni === '1'}
      >
        <form action={createUser} className="grid gap-4 lg:grid-cols-2">
          <TextInput label="Görünen ad" name="displayName" required minLength={2} maxLength={120} />
          <label>
            Kullanıcı adı{' '}
            <span className="font-normal text-[var(--muted)]">(boşsa addan üretilir)</span>
            <Input name="username" pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]" />
          </label>
          <TextInput label="E-posta" name="email" type="email" autoComplete="off" required />
          <TextInput
            label="Geçici parola"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            hint="En az 12 karakter. Parolayı güvenli bir kanaldan iletin."
          />
          <fieldset className="lg:col-span-2">
            <legend className="text-sm font-semibold">Roller</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {roles.map((role) => (
                <label key={role.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.key}
                    defaultChecked={role.key === 'member'}
                  />
                  {role.name} <span className="text-[var(--muted)]">({role.key})</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="lg:col-span-2">
            <SubmitButton type="submit" pendingText="Hesap oluşturuluyor…">
              Kullanıcı oluştur
            </SubmitButton>
          </div>
        </form>
      </CreatePanel>
      <RecordCollection
        count={users.data.length}
        label="Kullanıcı hesapları"
        placeholder="Ad, e-posta, kullanıcı adı veya rol ara…"
      >
        {users.data.map((user) => (
          <details
            key={user.id}
            className="admin-record-card"
            data-admin-record
            data-search={`${user.profile?.displayName ?? ''} ${user.email} ${user.profile?.username ?? ''} ${user.roles.join(' ')} ${user.status}`}
          >
            <summary>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {user.profile?.displayName ?? '—'}{' '}
                    <span className="text-sm font-normal text-[var(--muted)]">{user.email}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <Badge>{statusLabel[user.status] ?? user.status}</Badge>
                    {user.profile?.kind === 'EDITOR' && (
                      <Badge className="bg-amber-50 text-amber-800">Editör profili</Badge>
                    )}
                    <span>@{user.profile?.username ?? '—'}</span>
                    <span>
                      {user._count.authoredConcepts} konsept · {user._count.guides} rehber ·{' '}
                      {user._count.experiences} deneyim · {user._count.questions} soru
                    </span>
                    <span>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</span>
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Roller: {user.roles.join(', ') || 'Rol yok'} · Erişimi düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <div className="flex flex-wrap gap-2">
                <form action={setStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <Select name="status" defaultValue={user.status} className="min-h-9 text-sm">
                    <option value="ACTIVE">Aktif</option>
                    <option value="SUSPENDED">Askıya al</option>
                  </Select>
                  <SubmitButton type="submit" className="secondary">
                    Durumu kaydet
                  </SubmitButton>
                </form>
                {user.status !== 'DELETED' && (
                  <form action={softDelete}>
                    <input type="hidden" name="id" value={user.id} />
                    <ConfirmButton
                      confirmMessage={`${user.email} hesabını kapatmak istediğinizden emin misiniz? Aktif oturumları sonlandırılacaktır.`}
                    >
                      Hesabı kapat
                    </ConfirmButton>
                  </form>
                )}
              </div>
              <form action={setRoles} className="mt-4 border-t border-[var(--line)] pt-4">
                <input type="hidden" name="id" value={user.id} />
                <fieldset>
                  <legend className="text-sm font-semibold">Rol ve yetkiler</legend>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Değişiklik tüm yenileme oturumlarını iptal eder ve bir sonraki istekte geçerli
                    olur.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {roles.map((role) => (
                      <label key={role.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="roles"
                          value={role.key}
                          defaultChecked={user.roles.includes(role.key)}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-4">
                  <SubmitButton type="submit">Rolleri güvenli biçimde kaydet</SubmitButton>
                </div>
              </form>
            </div>
          </details>
        ))}
      </RecordCollection>
    </>
  );
}
