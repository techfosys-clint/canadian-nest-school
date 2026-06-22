# 🤖 AI Agent & Developer Handbook (Canadian Nest School)

This document serves as the **source of truth** and manual for AI coding assistants (like Antigravity, Claude, Cursor, Copilot, etc.) and developers working on the **Canadian Nest School** codebase. Read this file completely before making any structural, typing, or directory edits.

---

## ⚠️ Critical Next.js 15/16 Rules

<!-- BEGIN:nextjs-agent-rules -->
### This is NOT the Next.js you know
This codebase runs on **Next.js 16.2.6**, which introduces breaking changes regarding asynchronous route parameters:
1. **Asynchronous Route Parameters:**
   - `params` and `searchParams` inside pages, layouts, and `generateMetadata` functions are **Promises**. They must be treated as Promises throughout the app.
   - **DO NOT** prematurely await `params` when passing them to Payload CMS templates or metadata generators.
<!-- END:nextjs-agent-rules -->

---

## 🏗️ Project Architecture & Layout Boundaries

To prevent styling leaks, layout nesting issues (multiple `<html>` and `<body>` tags), and hydration conflicts, the codebase is isolated using **Next.js Route Groups**:

1. **🌐 Public Frontend (`app/(app)`)**
   - Contains all public website pages, layouts, and public-facing routes.
   - Has its own `layout.tsx` defining standard HTML tags.
   - Tailwind CSS configurations are loaded exclusively here.
   - Entry point: `app/(app)/page.tsx` (Canadian Nest School Landing Page).

2. **⚙️ Payload CMS Admin & API Gateway (`app/(payload)`)**
   - Contains the Admin panel catch-all routes under `/admin` and API routes under `/api`.
   - Has its own isolated `layout.tsx` which wraps pages inside Payload's `RootLayout`.
   - Uses a dynamic `'use server'` action to link client actions to server requests.

---

## 🛠️ Payload CMS 3.x System Typings & Guidelines

Always follow these exact type patterns to ensure Next.js compiling checks pass:

### 1. Root Layout Server Action (`app/(payload)/layout.tsx`)
Payload 3.x requires a `serverFunction` prop of type `ServerFunctionClient` to execute server operations safely. It must be wrapped in a server action:
```tsx
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@payload-config'
import { importMap } from './admin/importMap.js'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config: configPromise,
    importMap,
  })
}
```

### 2. Admin Route Parameter Typing (`admin/[[...segments]]`)
When passing route params to `generatePageMetadata`, `RootPage`, or `NotFoundPage`, **pass the Promise itself** without calling `await`:
```tsx
type PageParams = { segments: string[] }
type SearchParams = { [key: string]: string | string[] }

type Props = {
  params: Promise<PageParams>
  searchParams: Promise<SearchParams>
}

// Pass parameters directly as Promises!
export async function generateMetadata({ params, searchParams }: Props) {
  return generatePageMetadata({ config, params, searchParams })
}
```

### 3. Path Alias
Always reference the Payload configuration using the path alias `@payload-config` (maps to `./payload.config.ts`). Do not use relative imports like `../../payload.config` for the main configuration.

### 4. Admin Meta Config
When customizing the Admin panel favicon in `payload.config.ts`, do not use the deprecated `favicon` property. Use the `icons` array instead:
```typescript
meta: {
  titleSuffix: '- Canadian Nest School Admin',
  icons: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      url: '/favicon.ico',
    },
  ],
}
```

---

## 💾 Database Schemas & Registry (MongoDB)

The MongoDB database stores data for 6 core collections:

1. **Users (`users`):** Authentication collection. Roles: `admin` | `instructor` | `student`.
2. **Media (`media`):** Upload collection for graphic assets. Resizes images into `thumbnail`, `card`, and `hero` resolutions using **Sharp**.
3. **Categories (`categories`):** Groups course listings (e.g. Development, Design, Business).
4. **Courses (`courses`):** Active courses with descriptions (Lexical RichText), pricing, thumbnail, category, and instructor relations.
5. **Lessons (`lessons`):** Dynamic lessons belonging to courses. Supports numerical sorting (`order` field) and video streaming links.
6. **Enrollments (`enrollments`):** Tracks user course purchases, transaction references, and payment status (`pending`, `completed`, `refunded`).

---

## 🛠️ Step-by-Step AI Workflows

### How to Add a New Collection
1. Define the schema inside `collections/MyNewCollection.ts` using `CollectionConfig` from `payload`.
2. Open `payload.config.ts`, import the collection, and add it to the `collections: [...]` array.
3. Run `pnpm build` to compile the application and automatically regenerate the TypeScript models inside `payload-types.ts`.

### How to Fetch Data on the Server (RSC / Server Actions)
Do not perform network fetch requests to `/api/courses`. Instead, use the **Local API** which runs directly on the database level:
```typescript
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const payload = await getPayload({ config: configPromise })
const courses = await payload.find({
  collection: 'courses',
  where: {
    status: {
      equals: 'published',
    },
  },
})
```

---

## 🚀 Standard Development Commands

- **Start Dev Environment:** `pnpm dev`
- **Verify Build Validity:** `pnpm build` (ensures 100% type safety before commits)
- **Regenerate Dynamic Component Imports:** `npx payload generate:importmap`

---

## 🎨 Global Styling, Typography & Design Tokens

When creating, editing, or refactoring UI components, developers and AI agents MUST adhere to these exact styling boundaries:

1. **Typography & Font Weight Constraints:**
   - **Maximum Font Weight:** Do NOT use any font weight greater than **700 (bold)** anywhere. `font-extrabold` (800) and `font-black` (900) are strictly PROHIBITED. Always use `font-bold` (700), `font-semibold` (600), `font-medium` (500), or `font-normal` (400).
   - **Minimum Font Size:** Text, inputs, buttons, and readable body elements must have a minimum font size of **16px** (Tailwind `text-base` or equivalent). Do not use smaller sizes for readable body text or inputs.

2. **Layout & Borders:**
   - **Maximum Border Radius:** The absolute maximum border radius for cards, buttons, input fields, containers, and boxes is **8px** (Tailwind `rounded-lg` or equivalent). Do not use `rounded-xl`, `rounded-2xl`, `rounded-3xl` etc. (except for circular elements like avatars which can use `rounded-full`).
   - **Layout Containers & Max Widths:** Always use the standard Tailwind `container mx-auto` class wrappers for page-level structural margins and maximum boundaries. Using hardcoded max-width utilities (like `max-w-7xl` or custom max widths) on layout containers is strictly prohibited.
   - **No Black Borders:** Absolutely DO NOT use pure black color borders (`border-black`, `border-zinc-950`, `#000000`, or dark unstyled borders) anywhere in the styling. Use premium soft borders (e.g., `border-zinc-200/80`, `border-slate-100`, or translucent brand colors like `border-[#615fff]/60`) instead.
   - **Alternating Full-Width Backgrounds:** Every page's sections must utilize alternating or varying full-width background colors (e.g., `#ffffff` vs `#f8fafc` or matching custom brand colors/gradients) just like the home page to maintain a premium, distinct, and dynamic flow. Do not place all sections under a single continuous flat background.

---

## 🚫 Direct Execution Rule (No Planning Mode)

All AI agents (including Antigravity, Claude, Cursor, Copilot, etc.) working on this codebase MUST follow these direct execution instructions:
1. **No Planning Documents:** Do NOT create `implementation_plan.md`, `task.md`, or `walkthrough.md` files.
2. **Direct Action:** Do NOT ask for plan approval or wait for planning feedback before proceeding.
3. **Immediate Implementation:** Analyze requests, identify the target files, and proceed directly with modifying the codebase or running necessary commands immediately.


