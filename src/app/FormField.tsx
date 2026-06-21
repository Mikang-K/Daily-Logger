import type { ReactNode } from 'react';

export function FormField({ label, suffix, children }: { label: string; suffix?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        {children}
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </label>
  );
}
