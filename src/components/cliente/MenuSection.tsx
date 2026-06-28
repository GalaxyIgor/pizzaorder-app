import type { ReactNode } from 'react';

interface MenuSectionProps {
  title: string;
  children: ReactNode;
  refProp?: React.RefObject<HTMLDivElement>;
}

export function MenuSection({ title, children, refProp }: MenuSectionProps) {
  return (
    <section ref={refProp} className="mb-12">
      <h2 className="font-display text-2xl font-bold mb-4 text-carbono">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </section>
  );
}
