'use client';

import { useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  API_SECTIONS,
  API_AUTH_INFO,
  METHOD_COLORS,
} from '@/constants/api-docs-spec';
import type { ApiEndpoint, ApiParam, ApiSection } from '@/constants/api-docs-spec';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Key,
  Zap,
  Shield,
  Globe,
  Lock,
} from 'lucide-react';

function MethodBadge({ method }: { method: string }): JSX.Element {
  const color = METHOD_COLORS[method] || 'bg-gray-500/15 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${color}`}
    >
      {method}
    </span>
  );
}

function StatusCodeBadge({ code }: { code: number }): JSX.Element {
  let color = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (code >= 400 && code < 500) {
    color = 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  } else if (code >= 500) {
    color = 'bg-red-500/15 text-red-700 dark:text-red-400';
  } else if (code === 201) {
    color = 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${color}`}>
      {code}
    </span>
  );
}

function CopyButton({ text }: { text: string }): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
      aria-label="Copy to clipboard"
    >
      {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }): JSX.Element {
  return (
    <div className="relative">
      {title && (
        <div className="rounded-t-lg border border-b-0 border-gray-700 bg-gray-800 px-4 py-2 text-xs font-medium text-gray-400">
          {title}
        </div>
      )}
      <div className={`relative rounded-${title ? 'b' : ''}lg border border-gray-700 bg-gray-900 p-4`}>
        <CopyButton text={code} />
        <pre className="overflow-x-auto text-sm leading-relaxed text-gray-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function ParamsTable({ params, title }: { params: ApiParam[]; title: string }): JSX.Element {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="w-[180px] text-xs font-semibold">Name</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold">Type</TableHead>
              <TableHead className="w-[80px] text-xs font-semibold">Required</TableHead>
              <TableHead className="text-xs font-semibold">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {params.map((param) => (
              <TableRow key={param.name}>
                <TableCell className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {param.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {param.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {param.required ? (
                    <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 text-xs border-0">
                      required
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">optional</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                  {param.description}
                  {param.default && (
                    <span className="ml-1 text-xs text-gray-400">
                      (default: <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{param.default}</code>)
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-950">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {endpoint.path}
        </code>
        <span className="ml-auto text-sm text-gray-500">{endpoint.summary}</span>
        {endpoint.scopes.length > 0 && (
          <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t px-4 pb-6 pt-4">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {endpoint.description}
          </p>
          {endpoint.scopes.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-500">Scopes:</span>
              {endpoint.scopes.map((scope) => (
                <Badge key={scope} variant="outline" className="font-mono text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
          )}
          <div className="space-y-5">
            {endpoint.pathParams && endpoint.pathParams.length > 0 && (
              <ParamsTable params={endpoint.pathParams} title="Path Parameters" />
            )}
            {endpoint.queryParams && endpoint.queryParams.length > 0 && (
              <ParamsTable params={endpoint.queryParams} title="Query Parameters" />
            )}
            {endpoint.requestBody && endpoint.requestBody.length > 0 && (
              <ParamsTable params={endpoint.requestBody} title="Request Body" />
            )}
            {endpoint.requestExample && (
              <CodeBlock code={endpoint.requestExample} title="Request Example" />
            )}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Response Fields
              </h4>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                      <TableHead className="w-[220px] text-xs font-semibold">Field</TableHead>
                      <TableHead className="w-[100px] text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpoint.responseFields.map((field) => (
                      <TableRow key={field.name}>
                        <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">
                          {field.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {field.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {field.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Status Codes
              </h4>
              <div className="flex flex-wrap gap-3">
                {endpoint.statusCodes.map((sc) => (
                  <div key={sc.code} className="flex items-center gap-2">
                    <StatusCodeBadge code={sc.code} />
                    <span className="text-sm text-gray-500">{sc.description}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock code={endpoint.responseExample} title="Response Example" />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionNav({ sections, activeSlug }: { sections: ApiSection[]; activeSlug: string }): JSX.Element {
  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <a
          key={section.slug}
          href={`#${section.slug}`}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
            activeSlug === section.slug
              ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {section.title}
          <Badge variant="outline" className="ml-auto text-xs">
            {section.endpoints.length}
          </Badge>
        </a>
      ))}
    </nav>
  );
}

export function ApiDocsClient(): JSX.Element {
  const [activeSlug, setActiveSlug] = useState(API_SECTIONS[0]?.slug || '');
  const totalEndpoints = API_SECTIONS.reduce((sum, s) => sum + s.endpoints.length, 0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible?.target.id) {
          setActiveSlug(visible.target.id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    );
    API_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.slug);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Wawa Garden Bar — API Reference
            </h1>
            <p className="text-xs text-gray-500">
              {totalEndpoints} endpoints &middot; REST &middot; JSON
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
              v1.0
            </Badge>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sections
              </p>
              <SectionNav sections={API_SECTIONS} activeSlug={activeSlug} />
            </div>
          </aside>
          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-10">
            {/* Auth intro card */}
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4 text-emerald-600" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  All endpoints (except <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-800">/health</code>)
                  require a valid API key. Pass the key via one of these headers:
                </p>
                <div className="space-y-2">
                  <CodeBlock code={`x-api-key: ${API_AUTH_INFO.keyFormat}\n\n# or\n\nAuthorization: Bearer ${API_AUTH_INFO.keyFormat}`} />
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-xs">Rate limit: <strong>{API_AUTH_INFO.rateLimit}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">Base URL: <code className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-800">/api/public</code></span>
                  </div>
                </div>
                <div className="pt-2">
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Response Envelope</h4>
                  <CodeBlock
                    code={`// Success\n{ "success": true, "data": { ... }, "meta": { "timestamp": "...", "page": 1, "limit": 25, "total": 100, "totalPages": 4 } }\n\n// Error\n{ "success": false, "error": "Error message" }`}
                  />
                </div>
              </CardContent>
            </Card>
            {/* Sections */}
            {API_SECTIONS.map((section) => (
              <section key={section.slug} id={section.slug} className="scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                </div>
                <div className="space-y-3">
                  {section.endpoints.map((endpoint) => (
                    <EndpointCard
                      key={`${endpoint.method}-${endpoint.path}`}
                      endpoint={endpoint}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
