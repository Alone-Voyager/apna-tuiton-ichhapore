"use client"
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
}

/**
 * Header — pure UI component, no sticky/fixed positioning.
 * The dashboard layout (layout.tsx) handles the fixed header View
 * and safe-area-inset-top padding. This component just renders content.
 */
export default function Header({ title, subtitle, onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        minHeight: 56,
      }}
    >
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden"
          style={{
            width: 36, height: 36,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 5, borderRadius: 10,
            background: 'transparent', border: 'none',
            cursor: 'pointer', flexShrink: 0,
          }}
          aria-label="Open menu"
        >
          <span style={{ display: 'block', width: 20, height: 2, background: '#334155', borderRadius: 1 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#334155', borderRadius: 1 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#334155', borderRadius: 1 }} />
        </button>

        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', lineHeight: 1.2, margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Add Student button */}
      <button
        onClick={() => router.push('/dashboard/admissions/new')}
        style={{
          background: '#1a1f2c', color: '#fff',
          border: 'none', borderRadius: 12,
          padding: '8px 14px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 6, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
        aria-label="Add new student"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">Add Student</span>
      </button>
    </div>
  );
}