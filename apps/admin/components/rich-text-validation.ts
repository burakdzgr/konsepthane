export function contentValidation(value: string, required: boolean, min: number, max: number) {
  const length = value.trim().length;
  if (required && !length) return 'Bu alan zorunludur.';
  if (length && length < min) return `En az ${min} karakter girin.`;
  if (length > max) return `En fazla ${max.toLocaleString('tr-TR')} karakter kullanılabilir.`;
  return '';
}
