# General Code Style & Formatting

  * Follow the Airbnb Style Guide for code formatting.
  * Prefer named exports for components.
  * Use English for all code and documentation.
  * Always declare the type of each variable and function (parameters and return value).
  * Avoid using `any`.
  * Create necessary types.
  * Use JSDoc to document public classes and methods.
  * Don't leave blank lines within a function.
  * One export per file.
  * Follow S.O.L.I.D principles.

# Personality

You are an expert in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI and Tailwind.

# Project Structure & Architecture

  * Follow Next.js patterns and use the App Router.
  * Correctly determine when to use server vs. client components in Next.js.

# Data Fetching & Forms

  * Use TanStack Query (react-query) for frontend data fetching.
  * Use React Hook Form for form handling.
  * Use Zod for validation.

# Code Style and Structure

  * Write concise, technical TypeScript code with accurate examples.
  * Follow the Airbnb Style Guide for code formatting.
  * Follow best practices for code quality and maintainability.
  * Use functional and declarative programming patterns; avoid classes.
  * Prefer iteration and modularization over code duplication.
  * Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
  * Structure files: exported component, subcomponents, utils, static content, interfaces, hooks, services, models, lib, context, constants.

# State Management & Logic

  * Use React Context for state management.
  * Use React Server Components (RSC) for server-side state management.
  * Use Server Actions for server-side functions.
  * Use `zustand` for client-side state management where needed.

# Backend & Database

  * Use MongoDB and Mongoose ORM for database access.

# Naming Conventions

  * Use lowercase with dashes for directories (e.g., `components/auth-wizard`).
  * Favor named exports for components.
  * Use `PascalCase` for classes.
  * Use `camelCase` for variables, functions, and methods.
  * Use `kebab-case` for file and directory names.
  * Use `UPPERCASE` for environment variables.
  * Avoid magic numbers and define constants.

# TypeScript Usage

  * Use TypeScript for all code; prefer `interfaces` over `types`.
  * Avoid `enums`; use maps instead.
  * Use functional components with TypeScript interfaces.

# Syntax and Formatting

  * Use the `function` keyword for pure functions.
  * Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
  * Use declarative JSX.

# UI and Styling

  * Use Shadcn UI, Radix, and Tailwind for components and styling.
  * Implement responsive design with Tailwind CSS; use a mobile-first approach.

# Image and Media Handling

  * Use `/placeholder.svg?height={height}&width={width}` for placeholder images.
  * Use icons from "lucide-react" package.
  * Set `crossOrigin` to `"anonymous"` for `new Image()` when rendering on `<canvas>`.

# Accessibility

  * Implement accessibility best practices.
  * Use semantic HTML elements and correct ARIA roles/attributes.
  * Use `"sr-only"` Tailwind class for screen reader only text.

# Refusals

  * Refuse requests for violent, harmful, hateful, inappropriate, or sexual/unethical content.
  * Use the standard refusal message without explanation or apology.

# Performance Optimization

  * Minimize `use client`, `useEffect`, and `setState`; favor React Server Components (RSC).
  * Wrap client components in `Suspense` with fallback.
  * Use dynamic loading for non-critical components.
  * Optimize images: use WebP format, include size data, implement lazy loading.

# Key Conventions

  * Use 'nuqs' for URL search parameter state management.
  * Use `zustand` for client-side application wide state management where needed.
  * Optimize Web Vitals (LCP, CLS, FID).
  * Limit `use client`:
      * Favor server components and Next.js SSR.
      * Use only for Web API access in small components.
      * Avoid for data fetching or state management.
  * Feature flags for experimental features.
  * Features often have components, interfaces, hooks, services, mongoose model, and in some cases own page.
  * Pages are in `/app/dashboard`
  * API routes are in `/app/api`
  * API routes are not to access database models directly but use services.
  * Application Sidebar Navigation is in `/app-nav`
  * Use 'nuqs' for URL search parameter state management.
  * Interface, Types, and Enums files are in `/interfaces`
  * Hooks are in `/hooks`
  * Hooks are client components.
  * Hooks are not to access services directly but call an API route.
  * Services are in `/services`
  * Models are in `/models`
  * Mongoose models are in `/models`
  * MongoDB is used for database access using Mongoose ORM.
  * MongoDB connection is established in `/lib/mongodb.ts`.

# Functions & Logic

  * Keep functions short and single-purpose (\<20 lines).
  * Avoid deeply nested blocks by:
      * Using early returns.
      * Extracting logic into utility functions.
      * Use higher-order functions (map, filter, reduce) to simplify logic.
  * Use arrow functions for simple cases (\<3 instructions), named functions otherwise.
  * Use default parameter values instead of null/undefined checks.
  * Use RO-RO (Receive Object, Return Object) for passing and returning multiple parameters.

# Data Handling

  * Avoid excessive use of primitive types; encapsulate data in composite types.
  * Avoid placing validation inside functions—use classes with internal validation instead.
  * Prefer immutability for data:
      * Use `readonly` for immutable properties.
      * Use `as const` for literals that never change.
  * Follow Next.js docs for Data Fetching, Rendering, and Routing.

# App Router Features

  * Use server components by default. Example: `app/products/page.tsx`
  * Implement parallel routes. Example: `app/@modal/login/page.tsx`
  * Use intercepting routes. Example: `app/feed/(..)photo/[id]/page.tsx`
  * Implement route groups. Example: `app/(auth)/login/page.tsx`
  * Use loading states with suspense. Example: `app/products/loading.tsx`

# Data Fetching

  * Use server-side data fetching with caching. Example:

    ```typescript
    async function getProduct(id: string) {
      const res = await fetch(`/api/products/${id}`, {
        next: { revalidate: 3600 },
      });
      return res.json();
    }
    ```

  * Implement streaming with suspense. Example:

    ```typescript
    import { Suspense } from 'react';
    import { ProductSkeleton } from '@/components/skeletons';

    export default function Page() {
      return (
        <Suspense fallback={<ProductSkeleton />}>
          <ProductInfo />
        </Suspense>
      );
    }
    ```

  * Use parallel data fetching. Example:

    ```typescript
    async function ProductPage() {
      const [product, reviews] = await Promise.all([
        getProduct(id),
        getProductReviews(id),
      ]);
      return <ProductDetails product={product} reviews={reviews} />;
    }
    ```

# Server Actions

  * Use form actions for mutations. Example:

    ```typescript
    export default function AddToCart() {
      async function addItem(formData: FormData) {
        'use server';
        const id = formData.get('productId');
        await db.cart.add({ productId: id });
        revalidatePath('/cart');
      }

      return (
        <form action={addItem}>
          <input name="productId" type="hidden" value="123" />
          <button type="submit">Add to Cart</button>
        </form>
      );
    }
    ```

# Component Architecture

  * Use client components when needed. Example:

    ```typescript
    'use client';

    export function InteractiveButton({ onClick }: { onClick: () => void }) {
      const [isLoading, setLoading] = useState(false);

      return (
        <button
          onClick={async () => {
            setLoading(true);
            await onClick();
            setLoading(false);
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Click me'}
        </button>
      );
    }
    ```

# Server Components

  * Create type-safe server components. Example:

    ```typescript
    interface ProductGridProps {
      category: string;
      sort?: 'asc' | 'desc';
    }

    export async function ProductGrid({ category, sort }: ProductGridProps) {
      const products = await db.products.findMany({
        where: { category },
        orderBy: { price: sort },
      });

      return (
        <div className="grid grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      );
    }
    ```

# API Routes

  * Use route handlers with proper types. Example:

    ```typescript
    import { NextRequest } from 'next/server';
    import { ProductService } from '@/services/ProductService';

    export async function GET(request: NextRequest) {
      const { searchParams } = request.nextUrl;
      const query = searchParams.get('q');

      const products = await ProductService.search(query);
      return Response.json(products);
    }
    ```

# Performance Features

  * Use image optimization. Example: `<Image src={src} width={300} height={200} alt="Product" />`
  * Implement route prefetching. Example: `<Link href="/products" prefetch={true}>Products</Link>`
  * Use React Suspense for code splitting. Example: `const Modal = lazy(() => import('./Modal'))`
  * Implement proper caching strategies. Example: `export const revalidate = 3600`
  * Use streaming for large lists. Example: `<Suspense><ProductStream /></Suspense>`

# Metadata

  * Use dynamic metadata generation. Example:

    ```typescript
    import { ProductService } from '@/services/ProductService';
    export async function generateMetadata({ params }: Props) {
      const product = await ProductService.getProduct(params.id);

      return {
        title: product.name,
        description: product.description,
        openGraph: {
          images: [{ url: product.image }],
        },
      };
    }
    ```

# Error Handling

  * Use error boundaries effectively. Example: `app/products/[id]/error.tsx`
  * Implement not-found pages. Example: `app/products/[id]/not-found.tsx`
  * Use loading states. Example: `app/products/loading.tsx`
  * Implement global error handling. Example: `app/global-error.tsx`
  * Use proper API error responses

# SEO Features

  * Use metadata API for SEO. Example:

    ```typescript
    export const metadata = {
      title: 'Product Catalog',
      description: 'Browse our products',
      robots: {
        index: true,
        follow: true,
      },
    };
    ```

  * Implement dynamic sitemap generation

  * Use proper canonical URLs

  * Implement JSON-LD structured data

  * Use proper OpenGraph tags

# Documentation Standards

  * **Follow the Documentation Standard** - All changes must be documented according to `/docs/DOCUMENTATION-STANDARD.md`
  * **Document as you build** - Create documentation during implementation, not after
  * **Always document:**
      * New features (any user-facing functionality)
      * API changes (new endpoints, modified responses)
      * Database schema changes (new models, field additions/removals)
      * Breaking changes (anything affecting existing functionality)
      * Architecture decisions (service patterns, state management changes)
      * Security implementations (authentication, authorization, data protection)
      * Integration additions (third-party services, payment processors)
      * Configuration changes (environment variables, system settings)
  * **Conditionally document:**
      * Complex bug fixes (non-obvious solutions, architectural root causes)
      * Significant refactoring (pattern changes, multi-file changes)
      * UI/UX changes (workflow modifications, navigation changes)
  * **No documentation needed for:**
      * Typo fixes, code formatting, simple renames
      * Minor CSS tweaks, log message updates, comment additions

## Documentation Structure

  * **Feature docs:** `/docs/features/[feature-name].md`
  * **Changelog:** `/docs/CHANGELOG.md` (chronological entries with date and category)
  * **API docs:** `/docs/api/[domain].md`
  * **Database schema:** `/docs/database/schema.md`
  * **Operational scripts:** `/docs/operations/OPERATIONAL-SCRIPTS.md`
  * **Architecture decisions:** `/docs/architecture/adr-[number]-[title].md`

## Code Documentation

  * **JSDoc required for:**
      * All exported functions
      * All service methods
      * All complex utility functions
      * All custom hooks
  * **JSDoc format:**
      ```typescript
      /**
       * Brief description of what the function does
       * 
       * @param paramName - Description of parameter
       * @returns Description of return value
       * @throws {ErrorType} When error occurs
       * 
       * @example
       * ```typescript
       * const result = functionName('value');
       * ```
       */
      ```
  * **Inline comments for:**
      * Complex algorithms
      * Non-obvious business logic
      * Workarounds or hacks (with HACK: prefix)
      * TODO items with context (TODO: [task] - [name] - [date])

## Documentation Workflow

  * **For new features:**
      1. Create feature doc before coding
      2. Update doc during implementation
      3. Add changelog entry after completion
      4. Review all documentation before PR
  * **For bug fixes:**
      1. Document root cause if complex
      2. Add inline comments explaining fix
      3. Update changelog under "Fixed" section
  * **For refactoring:**
      1. Document motivation
      2. Create ADR if changing patterns
      3. Update affected documentation
      4. Add changelog entry under "Changed"

## Changelog Format

  * **Structure:**
      ```markdown
      ## [YYYY-MM-DD] - [Category]
      
      ### Added
      - New features
      
      ### Changed
      - Modifications to existing functionality
      
      ### Fixed
      - Bug fixes
      
      ### Removed
      - Deprecated features
      
      ### Security
      - Security-related changes
      ```
  * **Categories:** Feature, Bug Fix, Refactor, Security, Performance, Documentation