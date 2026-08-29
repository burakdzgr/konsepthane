import { Badge, Input, TextArea, TextInput } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { ImageUploadField } from '@/components/image-upload';
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

type AdminEditor = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  roles: string[];
  profile: {
    displayName: string;
    username: string | null;
    bio: string | null;
    longBio: string | null;
    jobTitle: string | null;
    expertise: string[];
    socialLinks: Record<string, string> | null;
    avatarUrl: string | null;
    editorActive: boolean;
    isPublic: boolean;
  } | null;
  _count: { authoredConcepts: number; guides: number };
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const socialKeys = ['instagram', 'pinterest', 'linkedin', 'x', 'youtube'] as const;

function profilePayload(formData: FormData) {
  const socialLinks: Record<string, string> = {};
  for (const key of socialKeys) {
    const url = formString(formData, `social_${key}`);
    if (url) socialLinks[key] = url;
  }
  return {
    displayName: formString(formData, 'displayName'),
    username: formString(formData, 'username') || undefined,
    jobTitle: formString(formData, 'jobTitle'),
    bio: formString(formData, 'bio'),
    longBio: formString(formData, 'longBio'),
    expertise: formString(formData, 'expertise')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    avatarUrl: formString(formData, 'avatarUrl'),
    websiteUrl: formString(formData, 'websiteUrl'),
    socialLinks,
    isPublic: formData.get('isPublic') === 'on',
    editorActive: formData.get('editorActive') === 'on',
  };
}

async function createEditor(formData: FormData) {
  'use server';
  await runAdminAction(
    '/editorler',
    async () => {
      await adminApi('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...profilePayload(formData),
          email: formString(formData, 'email'),
          password: formString(formData, 'password'),
          roles: ['editor'],
        }),
      });
    },
    'Editör oluşturuldu.',
  );
}
async function updateEditor(formData: FormData) {
  'use server';
  await runAdminAction(
    '/editorler',
    async () => {
      await adminApi(`/users/${formString(formData, 'id')}`, {
        method: 'PATCH',
        body: JSON.stringify(profilePayload(formData)),
      });
    },
    'Editör profili güncellendi.',
  );
}
async function removeEditorRole(formData: FormData) {
  'use server';
  await runAdminAction(
    '/editorler',
    async () => {
      await adminApi(`/users/${formString(formData, 'id')}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles: ['member'] }),
      });
    },
    'Editör rolü kaldırıldı; hesap üye olarak devam eder, yayınlanmış içeriklerin yazar bilgisi korunur.',
  );
}

function EditorForm({ editor }: { editor?: AdminEditor }) {
  const profile = editor?.profile;
  return (
    <form action={editor ? updateEditor : createEditor} className="grid gap-4 lg:grid-cols-2">
      {editor && <input type="hidden" name="id" value={editor.id} />}
      <TextInput
        label="Ad"
        name="displayName"
        defaultValue={profile?.displayName}
        required
        minLength={2}
        maxLength={120}
      />
      <label>
        Slug / kullanıcı adı{' '}
        <span className="font-normal text-[var(--muted)]">(/editor/…; boşsa addan üretilir)</span>
        <Input
          name="username"
          defaultValue={profile?.username ?? ''}
          pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]"
        />
      </label>
      {!editor && (
        <>
          <TextInput label="E-posta" name="email" type="email" autoComplete="off" required />
          <TextInput
            label="Geçici parola"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </>
      )}
      <TextInput
        label="Unvan"
        name="jobTitle"
        defaultValue={profile?.jobTitle ?? 'Konsepthane Editörü'}
        maxLength={120}
      />
      <label>
        Uzmanlık alanları <span className="font-normal text-[var(--muted)]">(virgülle)</span>
        <Input
          name="expertise"
          defaultValue={profile?.expertise.join(', ') ?? ''}
          placeholder="Doğum Günü, Baby Shower, Parti Dekorasyonu"
        />
      </label>
      <div className="lg:col-span-2">
        <TextArea
          label="Kısa biyografi"
          name="bio"
          defaultValue={profile?.bio ?? ''}
          maxLength={500}
          rows={2}
          hint="Editör sayfasında ve içerik altındaki 'Yazar hakkında' kutusunda görünür."
        />
      </div>
      <div className="lg:col-span-2">
        <TextArea
          label="Uzun biyografi (opsiyonel)"
          name="longBio"
          defaultValue={profile?.longBio ?? ''}
          maxLength={8000}
          rows={5}
        />
      </div>
      <ImageUploadField
        name="avatarUrl"
        label="Avatar"
        defaultValue={profile?.avatarUrl ?? ''}
        aspect="1 / 1"
        hint="Kare, yüz odaklı bir fotoğraf; editör sayfasında ve yazar kutusunda görünür."
      />
      <label>
        Web sitesi
        <Input
          name="websiteUrl"
          type="url"
          defaultValue={
            editor?.profile
              ? ((editor.profile as { websiteUrl?: string | null }).websiteUrl ?? '')
              : ''
          }
        />
      </label>
      {socialKeys.map((key) => (
        <label key={key}>
          {key === 'x' ? 'X (Twitter)' : key[0]!.toUpperCase() + key.slice(1)}
          <Input
            name={`social_${key}`}
            type="url"
            defaultValue={profile?.socialLinks?.[key] ?? ''}
            placeholder="https://…"
          />
        </label>
      ))}
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isPublic" defaultChecked={profile?.isPublic ?? true} /> Profil
        herkese açık
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="editorActive" defaultChecked={profile?.editorActive ?? true} />{' '}
        Aktif editör
        <span className="text-xs text-[var(--muted)]">
          (pasif: profil sayfası ve sitemap'ten kalkar, yazar adı içeriklerde kalır)
        </span>
      </label>
      <div className="lg:col-span-2">
        <SubmitButton type="submit" pendingText="Editör kaydediliyor…">
          {editor ? 'Profili kaydet' : 'Editör hesabı oluştur'}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function EditorsPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, editors] = await Promise.all([
    searchParams,
    adminApi<{ data: AdminEditor[] }>('/users?role=editor&pageSize=100'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Ekip ve erişim · Yazarlar"
        title="Editörler"
        description="Konsept ve rehberlerin gerçek yazar profillerini yönetin. Her byline doğrulanabilir bir kişiye bağlanır; profil görünürlüğü içerik yazarlığından bağımsız kontrol edilir."
      />
      <WorkflowHint
        steps={[
          'Gerçek kimlik, unvan ve uzmanlık bilgilerini girin.',
          'Biyografi ve sosyal bağlantıları doğrulayıp profili kontrol edin.',
          'Erişim bittiğinde rolü kaldırın; eski içerik byline’larını koruyun.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <CreatePanel
        title="Yeni editör oluştur"
        description="Hesap ve herkese açık yazar profili birlikte oluşturulur."
        open={yeni === '1'}
      >
        <EditorForm />
      </CreatePanel>
      <RecordCollection
        count={editors.data.length}
        label="Editör profilleri"
        placeholder="Ad, e-posta, uzmanlık veya durum ara…"
      >
        {editors.data.map((editor) => (
          <details
            key={editor.id}
            className="admin-record-card"
            data-admin-record
            data-search={`${editor.profile?.displayName ?? ''} ${editor.email} ${editor.profile?.expertise.join(' ') ?? ''} ${editor.profile?.editorActive ? 'aktif' : 'pasif'}`}
          >
            <summary>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{editor.profile?.displayName ?? editor.email}</strong>
                <Badge>{editor.profile?.editorActive ? 'Aktif' : 'Pasif'}</Badge>
                {editor.profile?.isPublic === false && (
                  <Badge className="bg-stone-100">Gizli profil</Badge>
                )}
                <span className="text-xs text-[var(--muted)]">
                  {editor.email} · {editor._count.authoredConcepts} konsept · {editor._count.guides}{' '}
                  rehber
                </span>
                {editor.profile?.username && (
                  <a
                    href={`${publicUrl}/tr/editor/${editor.profile.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--accent-strong)]"
                  >
                    Profili aç ↗
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {editor.email} · {editor._count.authoredConcepts} konsept · {editor._count.guides}{' '}
                rehber · Profili düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <EditorForm editor={editor} />
              <form
                action={removeEditorRole}
                className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
              >
                <input type="hidden" name="id" value={editor.id} />
                <ConfirmButton
                  confirmMessage={`${editor.profile?.displayName ?? editor.email} için editör rolünü kaldırmak istediğinizden emin misiniz?`}
                >
                  Editör rolünü kaldır
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
        {!editors.data.length && (
          <p className="text-sm text-[var(--muted)]">
            Henüz editör yok. Yukarıdaki formdan gerçek bir editör oluşturun.
          </p>
        )}
      </RecordCollection>
    </>
  );
}
