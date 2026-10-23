/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Draws a computed MenuLayout into a jsPDF document. The jsPDF constructor is
 * passed in so client code can `await import('jspdf')` (keeping it out of SSR
 * and the initial bundle) and tests can pass the real class.
 */
import type { jsPDF as JsPDF } from 'jspdf';
import type { MenuLayout, TextMeasurer } from './layout';
import type { MenuPrintTheme } from './themes';
import type { MenuPrintOrientation } from './types';

function setFont(doc: JsPDF, sizePt: number, bold: boolean): void {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(sizePt);
}

/** Measures text with jsPDF's own font metrics, in mm (the doc's unit). */
export function createJsPdfMeasurer(doc: JsPDF): TextMeasurer {
  return {
    width(text, sizePt, bold) {
      setFont(doc, sizePt, bold);
      return doc.getTextWidth(text);
    },
    split(text, sizePt, bold, maxWidthMm) {
      setFont(doc, sizePt, bold);
      return doc.splitTextToSize(text, maxWidthMm) as string[];
    },
  };
}

export function renderMenuPdf(
  JsPDFCtor: typeof JsPDF,
  layout: MenuLayout,
  orientation: MenuPrintOrientation,
  theme: MenuPrintTheme,
  logoDataUrl: string | null
): JsPDF {
  const doc = new JsPDFCtor({ orientation, unit: 'mm', format: 'a4' });
  for (let i = 1; i < layout.pages.length; i++) {
    doc.addPage('a4', orientation);
  }

  layout.pages.forEach((page, i) => {
    doc.setPage(i + 1);
    for (const op of page.ops) {
      switch (op.kind) {
        case 'text':
          setFont(doc, op.sizePt, op.bold);
          doc.setTextColor(theme[op.color]);
          doc.text(op.text, op.x, op.y, { align: op.align });
          break;
        case 'rule':
          doc.setDrawColor(theme[op.color]);
          doc.setLineWidth(op.widthMm);
          doc.line(op.x1, op.y1, op.x2, op.y2);
          break;
        case 'leader':
          doc.setDrawColor(theme[op.color]);
          doc.setLineDashPattern([0.3, 1.2], 0);
          doc.setLineWidth(0.3);
          doc.line(op.x1, op.y, op.x2, op.y);
          doc.setLineDashPattern([], 0);
          break;
        case 'logo':
          if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', op.x, op.y, op.w, op.h);
          }
          break;
      }
    }
  });

  return doc;
}
