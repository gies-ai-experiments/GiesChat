import type { ReactNode } from 'react';
import { cn } from '~/utils';

export default function PanelHeader({
  title,
  search,
  actions,
  className,
}: {
  title: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('border-b border-border-light px-4 py-3', className)} role="banner">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-lg font-semibold text-text-primary">{title}</h2>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {search && <div className="mt-2">{search}</div>}
    </header>
  );
}
