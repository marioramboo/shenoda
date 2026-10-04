import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'h1',
            'h2',
            'body-default',
            'body-medium',
            'body-small',
            'caption',
            'button',
          ],
        },
      ],
      'text-color': [
        {
          text: [
            'text-primary',
            'text-secondary',
            'text-disabled',
            'text-inverse',
            'brand-primary',
            'brand-primary-dark',
            'brand-primary-soft',
            'brand-accent',
            'brand-accent-soft',
            'status-success',
            'status-danger',
            'status-warning',
            'status-info',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
