import type { LucideProps } from 'lucide-react';

export const AppLogo = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 10l4 2-4 2-4-2 4-2z" />
    <line x1="12" y1="22" x2="12" y2="14" />
  </svg>
);
