import type { SVGAttributes } from 'react';

export type IconName =
  | 'search'
  | 'bookmark'
  | 'bookmark-filled'
  | 'heart'
  | 'heart-filled'
  | 'comment'
  | 'plus'
  | 'home'
  | 'compass'
  | 'user'
  | 'settings'
  | 'bell'
  | 'arrow-right'
  | 'users'
  | 'help'
  | 'chevron-down'
  | 'chevron-left'
  | 'flag'
  | 'check'
  | 'sparkle'
  | 'camera'
  | 'grid'
  | 'x'
  | 'share'
  | 'menu'
  | 'chevron-right';

const paths: Record<IconName, string> = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm9 16-4.2-4.2',
  bookmark: 'M6 4h12v17l-6-4.5L6 21V4Z',
  'bookmark-filled': 'M6 4h12v17l-6-4.5L6 21V4Z',
  heart: 'M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.5 2.4c0 5.4-7.5 10-7.5 10Z',
  'heart-filled':
    'M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.5 2.4c0 5.4-7.5 10-7.5 10Z',
  comment:
    'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4V6.5Z',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L14.8 3H9.2l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L4.7 11a7.4 7.4 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h5.6l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6c.07-.33.1-.66.1-1Z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4h4',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  users:
    'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6m5 15a5 5 0 0 0-4-4.9',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2.5 6.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-left': 'm15 6-6 6 6 6',
  flag: 'M5 21V4h11l-1 4 1 4H5',
  check: 'm5 12 5 5L20 7',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  x: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  'chevron-right': 'm9 6 6 6-6 6',
  share: 'M12 4v12m0-12-4 4m4-4 4 4M5 14v6h14v-6',
};

export function Icon({
  name,
  size = 20,
  className,
  ...props
}: {
  name: IconName;
  size?: number | undefined;
  className?: string | undefined;
} & Omit<SVGAttributes<SVGSVGElement>, 'className' | 'width' | 'height'>) {
  const filled = name.endsWith('-filled');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(className ? { className } : {})}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
