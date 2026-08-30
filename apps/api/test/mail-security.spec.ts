import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTransport } from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';
import type * as NodemailerModule from 'nodemailer';
import { MailService } from '../src/common/mail.service';

vi.mock('nodemailer', async () => {
  const original = await vi.importActual<typeof NodemailerModule>('nodemailer');
  return { ...original, createTransport: vi.fn(original.createTransport) };
});

describe('patched Nodemailer security boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('blocks file reads through raw messages before accessing the filesystem', async () => {
    const transport = createTransport({
      streamTransport: true,
      buffer: true,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await expect(
      transport.sendMail({
        from: 'sender@example.test',
        to: 'recipient@example.test',
        raw: { path: '/nonexistent-security-test-fixture.txt' },
      }),
    ).rejects.toThrow(/file access rejected/i);
    transport.close();
  });
  it('blocks raw URL fetches before making a network request', async () => {
    const transport = createTransport({
      streamTransport: true,
      buffer: true,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await expect(
      transport.sendMail({
        from: 'sender@example.test',
        to: 'recipient@example.test',
        // Runtime supports href here, but @types/nodemailer 8 omits it from raw.
        // Exercise the advisory's actual untrusted payload rather than a file path.
        raw: { href: 'http://127.0.0.1:1/not-requested' } as unknown as NonNullable<
          SendMailOptions['raw']
        >,
      }),
    ).rejects.toThrow(/url access rejected/i);
    transport.close();
  });
  it('composes regular messages in memory with access restrictions enabled', async () => {
    const transport = createTransport({
      streamTransport: true,
      buffer: true,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const result = await transport.sendMail({
      from: 'sender@example.test',
      to: 'recipient@example.test',
      subject: 'Konsepthane',
      text: 'Parola yenileme',
      html: '<p>Parola yenileme</p>',
    });
    expect(result.envelope.to).toEqual(['recipient@example.test']);
    expect(Buffer.isBuffer(result.message)).toBe(true);
    if (!Buffer.isBuffer(result.message)) throw new Error('Expected an in-memory message buffer');
    expect(result.message.toString('utf8')).toContain('Parola yenileme');
    transport.close();
  });
  it('keeps transactional email usable and forbids loading content from files or URLs', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'test' });
    const transport = createTransport({ streamTransport: true });
    vi.spyOn(transport, 'sendMail').mockImplementation(sendMail);
    const create = vi.mocked(createTransport).mockReturnValueOnce(transport);
    const service = new MailService();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ disableFileAccess: true, disableUrlAccess: true }),
    );
    await expect(
      service.sendVerification('recipient@example.test', 'Test', 'https://example.test/verify'),
    ).resolves.toBe(true);
    await expect(
      service.sendPasswordReset('recipient@example.test', 'Test', 'https://example.test/reset'),
    ).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.every(([message]) => !('raw' in (message as object)))).toBe(true);
    transport.close();
  });
});
