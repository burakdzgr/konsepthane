'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { renderMarkdown, safeContentUrl } from '@ilham/content';
import { editorialExtensions } from './rich-text-extensions';
import { uploadFile } from './image-upload';

export type RichTextEditorProps = {
  value: string;
  label: string;
  labelId: string;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
};

export default function RichTextEditor({
  value,
  label,
  labelId,
  onChange,
  onBusy,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [panel, setPanel] = useState<'link' | 'image' | null>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const [initialHtml] = useState(() => renderMarkdown(value).html);
  const editor = useEditor({
    extensions: editorialExtensions(),
    content: initialHtml,
    immediatelyRender: false,
    injectCSS: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'rich-text-surface',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
      },
      handlePaste: (_view, event) => {
        if (!event.clipboardData?.files.length) return false;
        setError('Görsel eklemek için araç çubuğundaki Görsel düğmesini kullanın.');
        return true;
      },
      handleDrop: (_view, event) => {
        if (!event.dataTransfer?.files.length) return false;
        setError('Dosyayı Görsel düğmesinden yükleyin ve alt metnini girin.');
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      lastEmitted.current = current.getMarkdown();
      onChange(lastEmitted.current);
    },
  });

  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(renderMarkdown(value).html, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return <p role="status">Editör hazırlanıyor…</p>;

  const openPanel = (next: 'link' | 'image') => {
    setPanel(next);
    setError('');
    const attrs = editor.getAttributes(next);
    setUrl(String(next === 'link' ? (attrs.href ?? '') : (attrs.src ?? '')));
    setAlt(String(attrs.alt ?? ''));
  };
  const apply = () => {
    const safe = safeContentUrl(url, panel === 'image');
    if (!safe) {
      setError('Geçerli bir https:// adresi veya / ile başlayan site içi yol girin.');
      return;
    }
    if (panel === 'image') {
      if (!alt.trim()) {
        setError('Görselin ne gösterdiğini alt metin alanına yazın.');
        return;
      }
      if (editor.isActive('image'))
        editor.chain().focus().updateAttributes('image', { src: safe, alt: alt.trim() }).run();
      else editor.chain().focus().setImage({ src: safe, alt: alt.trim() }).run();
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: safe,
          marks: [{ type: 'link', attrs: { href: safe } }],
        })
        .run();
    } else editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
    setPanel(null);
    setError('');
  };
  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      setUrl((await uploadFile(file)).url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Görsel yüklenemedi.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const action = (text: string, run: () => void, active = false, disabled = false) => (
    <button type="button" aria-pressed={active} disabled={disabled || busy} onClick={run}>
      {text}
    </button>
  );

  return (
    <div className="rich-text-editor">
      <div className="rich-text-modes" role="group" aria-label={`${label} görünümü`}>
        {action('Düzenle', () => setMode('edit'), mode === 'edit')}
        {action('Önizleme', () => setMode('preview'), mode === 'preview')}
      </div>
      <div hidden={mode !== 'edit'}>
        <div className="rich-text-toolbar" role="group" aria-label={`${label} biçimlendirme`}>
          <select
            aria-label="Metin biçimi"
            value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'p'}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'p') editor.chain().focus().setParagraph().run();
              else
                editor
                  .chain()
                  .focus()
                  .setHeading({ level: Number(next) as 2 | 3 | 4 })
                  .run();
            }}
          >
            <option value="p">Paragraf</option>
            <option value="2">Başlık 2</option>
            <option value="3">Başlık 3</option>
            <option value="4">Başlık 4</option>
          </select>
          {action(
            'Kalın',
            () => {
              editor.chain().focus().toggleBold().run();
            },
            editor.isActive('bold'),
          )}
          {action(
            'İtalik',
            () => {
              editor.chain().focus().toggleItalic().run();
            },
            editor.isActive('italic'),
          )}
          {action(
            'Üstü çizili',
            () => {
              editor.chain().focus().toggleStrike().run();
            },
            editor.isActive('strike'),
          )}
          {action(
            'Madde listesi',
            () => {
              editor.chain().focus().toggleBulletList().run();
            },
            editor.isActive('bulletList'),
          )}
          {action(
            'Numaralı liste',
            () => {
              editor.chain().focus().toggleOrderedList().run();
            },
            editor.isActive('orderedList'),
          )}
          {action(
            'Alıntı',
            () => {
              editor.chain().focus().toggleBlockquote().run();
            },
            editor.isActive('blockquote'),
          )}
          {action('Bağlantı', () => openPanel('link'), editor.isActive('link'))}
          {action(
            'Bağlantıyı kaldır',
            () => {
              editor.chain().focus().unsetLink().run();
            },
            false,
            !editor.isActive('link'),
          )}
          {action('Görsel', () => openPanel('image'), editor.isActive('image'))}
          {action(
            'Tablo ekle',
            () => {
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            },
            false,
            editor.isActive('table'),
          )}
          {action('Ayırıcı', () => {
            editor.chain().focus().setHorizontalRule().run();
          })}
          {action('Biçimi temizle', () => {
            editor.chain().focus().unsetAllMarks().clearNodes().run();
          })}
          {action(
            'Geri al',
            () => {
              editor.chain().focus().undo().run();
            },
            false,
            !editor.can().undo(),
          )}
          {action(
            'Yinele',
            () => {
              editor.chain().focus().redo().run();
            },
            false,
            !editor.can().redo(),
          )}
        </div>
        {editor.isActive('table') && (
          <div className="rich-text-toolbar" role="group" aria-label="Tablo işlemleri">
            {action('Satır ekle', () => {
              editor.chain().focus().addRowAfter().run();
            })}
            {action('Sütun ekle', () => {
              editor.chain().focus().addColumnAfter().run();
            })}
            {action('Satırı sil', () => {
              editor.chain().focus().deleteRow().run();
            })}
            {action('Sütunu sil', () => {
              editor.chain().focus().deleteColumn().run();
            })}
            {action('Tabloyu sil', () => {
              editor.chain().focus().deleteTable().run();
            })}
          </div>
        )}
        {panel && (
          <fieldset
            className="rich-text-insert"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!busy) apply();
              }
            }}
          >
            <legend>
              {panel === 'image' ? 'Görsel ekle veya düzenle' : 'Bağlantı ekle veya düzenle'}
            </legend>
            <label>
              Adres
              <input
                type="text"
                value={url}
                maxLength={2048}
                placeholder={panel === 'image' ? 'https://… veya /media/…' : 'https://… veya /tr/…'}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
            {panel === 'image' && (
              <>
                <label>
                  Görsel alt metni
                  <input
                    type="text"
                    value={alt}
                    maxLength={220}
                    onChange={(event) => setAlt(event.target.value)}
                  />
                </label>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  aria-label="İçerik görseli dosyası"
                  disabled={busy}
                  onChange={(event) => {
                    void upload(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
                <small>
                  JPEG, PNG, WebP, AVIF · en fazla 15 MB. Yalnızca kullanma hakkınız olan görselleri
                  ekleyin. Açıklamayı görselin altındaki paragrafta yazabilirsiniz.
                </small>
              </>
            )}
            <div className="rich-text-toolbar">
              <button type="button" onClick={apply} disabled={busy}>
                {busy ? 'Yükleniyor…' : 'Uygula'}
              </button>
              <button type="button" onClick={() => setPanel(null)} disabled={busy}>
                Vazgeç
              </button>
            </div>
          </fieldset>
        )}
        <EditorContent editor={editor} />
      </div>
      {mode === 'preview' && (
        <div
          className="rich-text-preview rich-text-surface"
          aria-label={`${label} önizlemesi`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value, 'onizleme-').html }}
        />
      )}
      {error && (
        <p className="rich-text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
