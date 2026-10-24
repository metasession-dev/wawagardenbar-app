'use client';

/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * "Print New Menu" form, preview and PDF download. "Generate Menu" re-reads
 * items from the database and snapshots the options it used; "Download PDF"
 * always renders that snapshot, never the current form state, so a PDF
 * always matches the last generated preview (AC12).
 */
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AlertCircle, Download, Loader2, RefreshCw } from 'lucide-react';
import { getPrintableMenuDataAction } from '@/app/actions/admin/menu-print-actions';
import { buildMenuPrintModel } from '@/lib/menu-print/build-menu-print-model';
import {
  defaultTitleFor,
  effectiveTitle,
  menuPrintFilename,
} from '@/lib/menu-print/format';
import { computeMenuLayout, type MenuLayout } from '@/lib/menu-print/layout';
import { loadMenuLogos, type MenuLogos } from '@/lib/menu-print/logo';
import {
  createJsPdfMeasurer,
  renderMenuPdf,
} from '@/lib/menu-print/render-pdf';
import { MENU_PRINT_THEMES } from '@/lib/menu-print/themes';
import {
  DEFAULT_FOOTER_TEXT,
  FOOTER_MAX_LENGTH,
  PRICE_TYPE_LABELS,
  TITLE_MAX_LENGTH,
  type MenuPrintColumns,
  type MenuPrintOptions,
  type MenuPrintOrientation,
  type MenuPrintPriceType,
  type MenuPrintTemplate,
} from '@/lib/menu-print/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MenuPrintPreview } from './menu-print-preview';

interface MenuPrintClientProps {
  mainCategories: { slug: string; label: string }[];
}

interface Generated {
  options: MenuPrintOptions;
  layout: MenuLayout;
}

const PRICE_TYPES: MenuPrintPriceType[] = ['default', 'happyHour', 'show'];
const COLUMN_CHOICES: MenuPrintColumns[] = [1, 2, 3];
const ORIENTATIONS: { value: MenuPrintOrientation; label: string }[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];
const TEMPLATES: { value: MenuPrintTemplate; label: string }[] = [
  { value: 'brand', label: 'Brand colours' },
  { value: 'bw', label: 'Printer-friendly (black & white)' },
];

interface RadioChoice {
  value: string;
  label: string;
  testId: string;
}

function RadioField({
  id,
  label,
  value,
  onChange,
  choices,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: RadioChoice[];
}) {
  return (
    <div className="space-y-2">
      <Label id={`${id}-label`}>{label}</Label>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={value}
        onValueChange={onChange}
        className="gap-2"
      >
        {choices.map((choice) => (
          <div key={choice.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={choice.value}
              id={`${id}-${choice.value}`}
              data-testid={choice.testId}
            />
            <Label
              htmlFor={`${id}-${choice.value}`}
              className="font-normal cursor-pointer"
            >
              {choice.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export function MenuPrintClient({ mainCategories }: MenuPrintClientProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    mainCategories.map((m) => m.slug)
  );
  const [priceType, setPriceType] = useState<MenuPrintPriceType>('default');
  const [title, setTitle] = useState(defaultTitleFor('default'));
  const [titleTouched, setTitleTouched] = useState(false);
  const [columns, setColumns] = useState<MenuPrintColumns>(2);
  const [orientation, setOrientation] =
    useState<MenuPrintOrientation>('portrait');
  const [template, setTemplate] = useState<MenuPrintTemplate>('brand');
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER_TEXT);

  const [generated, setGenerated] = useState<Generated | null>(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logos, setLogos] = useState<MenuLogos | null>(null);
  const [isPending, startTransition] = useTransition();
  const logosPromise = useRef<Promise<MenuLogos | null> | null>(null);

  useEffect(() => {
    const promise = loadMenuLogos();
    logosPromise.current = promise;
    let active = true;
    promise.then((result) => {
      if (active) setLogos(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const currentOptions = useMemo<MenuPrintOptions>(
    () => ({
      mainCategorySlugs: [...selected].sort(),
      priceType,
      title: effectiveTitle(title, priceType),
      columns,
      orientation,
      template,
      footerText: footerText.trim(),
    }),
    [selected, priceType, title, columns, orientation, template, footerText]
  );

  const outOfDate =
    generated !== null &&
    JSON.stringify(generated.options) !== JSON.stringify(currentOptions);

  const handlePriceTypeChange = (value: string) => {
    const next = value as MenuPrintPriceType;
    setPriceType(next);
    if (!titleTouched) setTitle(defaultTitleFor(next));
  };

  const toggleMainCategory = (slug: string, checked: boolean) => {
    setSelected((prev) =>
      checked
        ? [...prev.filter((s) => s !== slug), slug]
        : prev.filter((s) => s !== slug)
    );
  };

  const handleGenerate = () => {
    const options = currentOptions;
    startTransition(async () => {
      const result = await getPrintableMenuDataAction(
        options.mainCategorySlugs
      );
      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to load menu items');
        return;
      }

      const model = buildMenuPrintModel({
        items: result.data.items,
        mainCategories: result.data.mainCategories,
        menuSettings: result.data.menuSettings,
        selectedMainCategorySlugs: options.mainCategorySlugs,
        priceType: options.priceType,
      });
      if (model.sections.length === 0) {
        setGenerated(null);
        setEmpty(true);
        setError(null);
        return;
      }

      // The logo affects layout (it reserves space on page 1), so wait for it.
      const loadedLogos = await (logosPromise.current ?? Promise.resolve(null));
      const { jsPDF } = await import('jspdf');
      const measurer = createJsPdfMeasurer(
        new jsPDF({ unit: 'mm', format: 'a4' })
      );
      const layout = computeMenuLayout(
        model,
        options,
        measurer,
        loadedLogos !== null
      );

      setGenerated({ options, layout });
      setEmpty(false);
      setError(null);
    });
  };

  const handleDownload = () => {
    if (!generated) return;
    const snapshot = generated;
    startTransition(async () => {
      const { jsPDF } = await import('jspdf');
      const theme = MENU_PRINT_THEMES[snapshot.options.template];
      const doc = renderMenuPdf(
        jsPDF,
        snapshot.layout,
        snapshot.options.orientation,
        theme,
        logos ? logos[theme.logo] : null
      );
      doc.save(menuPrintFilename(snapshot.options.title, new Date()));
    });
  };

  if (mainCategories.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No main categories are enabled.</AlertDescription>
      </Alert>
    );
  }

  const previewTheme = generated
    ? MENU_PRINT_THEMES[generated.options.template]
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Menu settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">
              Main categories
            </legend>
            {mainCategories.map((m) => (
              <div key={m.slug} className="flex items-center space-x-2">
                <Checkbox
                  id={`print-main-${m.slug}`}
                  data-testid={`print-main-${m.slug}`}
                  checked={selected.includes(m.slug)}
                  onCheckedChange={(checked) =>
                    toggleMainCategory(m.slug, checked === true)
                  }
                />
                <Label
                  htmlFor={`print-main-${m.slug}`}
                  className="font-normal cursor-pointer"
                >
                  {m.label}
                </Label>
              </div>
            ))}
          </fieldset>

          <RadioField
            id="print-price"
            label="Price type"
            value={priceType}
            onChange={handlePriceTypeChange}
            choices={PRICE_TYPES.map((t) => ({
              value: t,
              label: PRICE_TYPE_LABELS[t],
              testId: `print-price-${t}`,
            }))}
          />

          <div className="space-y-2">
            <Label htmlFor="print-title">Menu title</Label>
            <Input
              id="print-title"
              data-testid="print-title"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
            />
          </div>

          <RadioField
            id="print-columns"
            label="Columns"
            value={String(columns)}
            onChange={(v) => setColumns(Number(v) as MenuPrintColumns)}
            choices={COLUMN_CHOICES.map((n) => ({
              value: String(n),
              label: String(n),
              testId: `print-columns-${n}`,
            }))}
          />

          <RadioField
            id="print-orientation"
            label="Orientation"
            value={orientation}
            onChange={(v) => setOrientation(v as MenuPrintOrientation)}
            choices={ORIENTATIONS.map((o) => ({
              ...o,
              testId: `print-orientation-${o.value}`,
            }))}
          />

          <RadioField
            id="print-template"
            label="Template"
            value={template}
            onChange={(v) => setTemplate(v as MenuPrintTemplate)}
            choices={TEMPLATES.map((t) => ({
              ...t,
              testId: `print-template-${t.value}`,
            }))}
          />

          <div className="space-y-2">
            <Label htmlFor="print-footer">Footer text</Label>
            <Input
              id="print-footer"
              data-testid="print-footer"
              value={footerText}
              maxLength={FOOTER_MAX_LENGTH}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="print-generate"
              onClick={handleGenerate}
              disabled={selected.length === 0 || isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Generate Menu
            </Button>
            <Button
              variant="outline"
              data-testid="print-download"
              onClick={handleDownload}
              disabled={generated === null || isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 min-w-0">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {outOfDate && (
          <Alert data-testid="print-out-of-date">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Settings have changed. Click Generate Menu to update the preview.
            </AlertDescription>
          </Alert>
        )}
        {empty && (
          <Alert data-testid="print-empty">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No available items in the selected categories.
            </AlertDescription>
          </Alert>
        )}
        {generated && previewTheme ? (
          <MenuPrintPreview
            layout={generated.layout}
            theme={previewTheme}
            logoDataUrl={logos ? logos[previewTheme.logo] : null}
          />
        ) : (
          !empty && (
            <p className="text-sm text-muted-foreground">
              Choose your settings and click Generate Menu to see a preview.
            </p>
          )
        )}
      </div>
    </div>
  );
}
