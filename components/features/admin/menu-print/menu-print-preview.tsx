'use client';

/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * On-page preview: one SVG per page, drawing the same millimetre layout
 * operations as the PDF renderer, so the preview is a faithful scale of the
 * downloaded PDF (ADR-005).
 */
import type { DrawOp, MenuLayout } from '@/lib/menu-print/layout';
import { PT } from '@/lib/menu-print/layout';
import type { MenuPrintTheme } from '@/lib/menu-print/themes';

interface MenuPrintPreviewProps {
  layout: MenuLayout;
  theme: MenuPrintTheme;
  logoDataUrl: string | null;
}

const TEXT_ANCHOR = {
  left: 'start',
  center: 'middle',
  right: 'end',
} as const;

function renderOp(
  op: DrawOp,
  key: number,
  theme: MenuPrintTheme,
  logoDataUrl: string | null
) {
  switch (op.kind) {
    case 'text':
      return (
        <text
          key={key}
          x={op.x}
          y={op.y}
          fontSize={op.sizePt * PT}
          fontWeight={op.bold ? 700 : 400}
          fontFamily="Helvetica, Arial, sans-serif"
          textAnchor={TEXT_ANCHOR[op.align]}
          fill={theme[op.color]}
        >
          {op.text}
        </text>
      );
    case 'rule':
      return (
        <line
          key={key}
          x1={op.x1}
          y1={op.y1}
          x2={op.x2}
          y2={op.y2}
          stroke={theme[op.color]}
          strokeWidth={op.widthMm}
        />
      );
    case 'leader':
      return (
        <line
          key={key}
          x1={op.x1}
          y1={op.y}
          x2={op.x2}
          y2={op.y}
          stroke={theme[op.color]}
          strokeWidth={0.3}
          strokeDasharray="0.3 1.2"
        />
      );
    case 'logo':
      return logoDataUrl ? (
        <image
          key={key}
          href={logoDataUrl}
          x={op.x}
          y={op.y}
          width={op.w}
          height={op.h}
        />
      ) : null;
  }
}

export function MenuPrintPreview({
  layout,
  theme,
  logoDataUrl,
}: MenuPrintPreviewProps) {
  const n = layout.pages.length;
  return (
    <section aria-labelledby="print-preview-heading" className="space-y-4">
      <h2 id="print-preview-heading" className="text-lg font-semibold">
        Preview
      </h2>
      {layout.pages.map((page, i) => (
        <svg
          key={i}
          data-testid="menu-print-page"
          data-template={theme.id}
          viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
          className="w-full h-auto bg-white shadow border"
          role="img"
          aria-label={`Menu page ${i + 1} of ${n}`}
        >
          {page.ops.map((op, j) => renderOp(op, j, theme, logoDataUrl))}
        </svg>
      ))}
    </section>
  );
}
