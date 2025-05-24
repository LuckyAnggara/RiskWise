import type { Metadata } from 'next';

// Global styles and fonts will be handled by the locale-specific layout
// ./globals.css is imported in src/app/[locale]/layout.tsx

export const metadata: Metadata = {
  title: 'RiskWise - Risk Management', // This can remain global or be made locale-specific
  description: 'Comprehensive risk management application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The root layout now simply returns children.
  // The <html> and <body> tags will be in [locale]/layout.tsx
  return <>{children}</>;
}
