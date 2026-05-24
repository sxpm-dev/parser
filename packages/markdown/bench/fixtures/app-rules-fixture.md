# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**When Planning New Features**:

1. Create feature branch first: `git checkout -b feature/<name>`
2. Write design documents and plans on the feature branch
3. Implement on the feature branch
4. Create PR to merge back to `main`

## Database

- **All DB migrations are done by developers** — Claude only works with the generated `types_db.ts`
- Never create or modify Supabase migrations
- If schema changes are needed, notify the developer and work with the existing generated types

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages
  - `[workspaceTag]/` - Workspace-scoped routes (products, domains, docs, team, etc.)
  - `@modal/` - Parallel route for modals
  - `auth/` - Authentication pages
- `server/` - Server-side code
  - `services/` - Business logic services extending `BaseService`
    - `assistants/` - AI-powered assistants (see `AI_RECORD_ASSISTANT.md` for details)
  - `actions/` - Server actions (marked with `'use server'`)
- `components/` - React components
  - `columns/` - Reusable DataTable column components (one component per file)
  - `pages/` - Full page components (ProductPage, TeamPage, etc.)
  - `layouts/` - Layout components
  - `chips/` - Small UI chips for entities, organized by entity in subdirectories (`user/`, `product/`, `focus/`, `product-record/`, `document/`)
  - `timeline/` - All timeline components (entity timelines, builders, shared timeline UI)
  - `ProductList/`, `FocusList/`, `UserList/` - Standalone Listbox-based selection lists for entities
- `interfaces/` - TypeScript interfaces for BE → FE communication (entity shapes from Supabase and entity-derived views like grid rows). Service payload types live in `server/services/*/types.ts`, component-specific types live near their components.
- `hooks/` - Custom React hooks (`useServerAction`, `useAppUrl`, `useFormState`)
- `url/` - URL builder (`AppUrl` class for type-safe routing)
- `errors/` - Custom error classes (`ServiceError`, `ServerActionError`, `BaseError`)
- `client-shared/` - Shared client utilities (workspace colors/icons, product helpers)

### F(Action, Entity) Pattern (CRITICAL)

**Every operation on an entity beyond basic CRUD is expressed as an Action and processed by ActionsService.**

```
Caller (Web/CLI/API) → ActionsService.createAction(actionType, entityId)
  → State machine validation
  → Route to entity service for domain-specific side effects
  → Record action in DB
  → Apply status change
```

**Entity Service = Repository + Domain Logic:**
- **Repository methods** (called by anyone): `create`, `update`, `delete`, `list`, `get`
- **Domain logic methods** (called ONLY by ActionsService): auto-iteration, date cascades, split, etc.

**Rules:**
- Callers NEVER call entity service methods for state changes — always `ActionsService.createAction()`
- Entity services NEVER call `ActionsService.createAction()` — that's backwards
- ActionsService routes to entity services for domain-specific side effects
- Complex operations (`splitFocus`, `moveFocusDate`) are action types, not direct service calls

### Key Patterns

**Server Actions**: Use `withServerActionResult()` wrapper to return `{ data, error }` shape.

**URL Building**: Use `AppUrl` class for all route generation:

```typescript
const url = new AppUrl();
url.workspace.page(tag); // /{tag}
url.products.list(tag); // /{tag}/products
url.products.product(tag, id); // /{tag}/products/{id}
```

**Supabase Queries**: Use `.overrideTypes<T, { merge: false }>()` for typed responses with aliased columns (e.g., `fullName:full_name`).

### Data Flow

**Server → Client**: Pass data from server components to client components using React Context.

- Server components fetch data and wrap client components with context providers
- See `components/Providers/AppContexts.tsx` for how contexts are configured
- Client components consume context via `useContext()` hooks
- **Never pass entity data as props to Layout or Page components** — always use context providers in the server component and `useContext()` hooks in the client component

  ```tsx
  // Good - server wraps with context, client consumes
  // layout.tsx
  <FocusContextProvider value={focus}>
    <FocusLayout>{children}</FocusLayout>
  </FocusContextProvider>;

  // FocusLayout.tsx
  const focus = useFocus(); // from context

  // Bad - passing data as props
  <FocusLayout focus={focus} rootFocus={rootFocus}>
    {children}
  </FocusLayout>;
  ```

- **Contexts are per entity type, not per use case**: Use existing entity contexts (`useProductRecords`, `useFocuses`, etc.) and filter by IDs from the current entity. Never create narrow contexts like `FocusRecordsContext` — instead, get records from the existing `ProductRecordsContext` filtered by the focus's record IDs
- **Use runtime API hooks for entity lookups**: When you need to look up entities by ID, use runtime API hooks (e.g., `useFocusAPI().get(id)`) which wrap entity contexts with Map-based lookups
- **Never fetch data on the client side** (no `useEffect` + fetch). All data must be preloaded server-side and passed as props or via context. If a page needs related data (e.g., date change history for a milestone), include it in the entity returned by the service method rather than fetching separately on the client.

**Client → Server**: Use React server actions as proxy calls to services.

- Server actions (in `server/actions/`) are thin wrappers marked with `'use server'`
- All business logic and implementation belongs in services (in `server/services/`)
- Server actions validate input, call service methods, and return results via `withServerActionResult()`

### Naming Conventions

**Frontend (TypeScript/React)**: Always use `camelCase`

```typescript
// Good
interface IProduct {
  productName: string;
  createdAt: Date;
}
```

**Interface Naming**: Always use `I` prefix for interfaces

```typescript
// Good
export interface IReleaseFormProps {
  form: UseFormState<IReleaseFormValues, IProductRelease>;
  initialTargetDate: string;
}

// Bad - missing I prefix
export interface ReleaseFormProps {
  form: UseFormState<IReleaseFormValues, IProductRelease>;
  initialTargetDate: string;
}
```

**Backend (Database/Supabase)**: Fields use `snake_case`

```sql
-- Database schema
products (
  product_name TEXT,
  created_at TIMESTAMP
)
```

**Type Conversion**: Use Supabase aliases to transform snake_case to camelCase:

```typescript
.select('productName:product_name, createdAt:created_at')
.overrideTypes<Product, { merge: false }>()
```

**Database Enums**: When a field maps to a Supabase/Postgres enum, use a TypeScript `enum` (not a `type` union) with PascalCase members and the original DB string values:

```typescript
// Good - TypeScript enum with DB string values
export enum ReleasePriority {
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

// Bad - string union type
export type ReleasePriority = 'normal' | 'high' | 'critical';
```

Always reference enum members instead of string literals:

```typescript
// Good
priority: payload.priority ?? ReleasePriority.Normal
case ReleasePriority.Critical:
{ [PullRequestStatus.Opened]: { color: 'success', label: 'Open' } }

// Bad - raw string literals
priority: payload.priority ?? 'normal'
case 'critical':
{ opened: { color: 'success', label: 'Open' } }
```

### Path Aliases

- `@/*` maps to project root

### Code Style

**Type Annotations**:

- **Let TypeScript infer when possible**: Do not add explicit type annotations when the type can be inferred from the initializer

  ```typescript
  // Good - type is inferred
  const COLUMNS = [
    ProductRecordsTableColumn.Switch,
    ProductRecordsTableColumn.Title
  ];

  // Bad - redundant annotation
  const COLUMNS: ProductRecordsTableColumn[] = [
    ProductRecordsTableColumn.Switch,
    ProductRecordsTableColumn.Title
  ];
  ```

**Nullish Values**:

- **Required nullable props use `| null`**: When a prop is always passed but its value can be null, use `| null`
- **Truly optional props use `?` with `| null`**: When a prop can be omitted entirely (caller doesn't need to pass it), use `?` combined with `| null`. Never force callers to pass `null` explicitly for props they don't care about
- At third-party API boundaries (e.g., HeroUI `onPress`), convert with `?? undefined`

  ```tsx
  // Good - required nullable (caller always provides a value or null)
  interface IMyComponentProps {
    onAction: (() => void) | null;
    product: IProduct | null;
  }

  <MyComponent onAction={isSaved ? null : handleAction} product={selectedProduct} />

  // Good - truly optional (caller can omit entirely)
  interface IMyComponentProps {
    initialDate?: string | null;
    dateChangesCount?: number | null;
  }

  // Edit mode - pass the values
  <MyComponent initialDate={release.targetDate} dateChangesCount={3} />
  // Add mode - just omit them
  <MyComponent />

  // Bad - forcing callers to pass null for props they don't use
  <MyComponent initialDate={null} dateChangesCount={null} />
  ```

**className Concatenation**:

- **Always use `clsx`**: For conditional or dynamic className composition, always use `clsx` instead of template literals or string concatenation

  ```tsx
  // Good
  import clsx from 'clsx';

  <div className={clsx('base-class', isActive && 'active', className)} />

  // Bad - template literal concatenation
  <div className={`base-class ${isActive ? 'active' : ''} ${className ?? ''}`} />
  ```

**Page Component Naming**:

- **Three naming suffixes for router-facing components**:
  - `*Layout` — referenced from `layout.tsx`, renders `AppPageLayout` and wraps nested routes
  - `*View` — referenced from `page.tsx`, does NOT render `AppPageLayout` (relies on the sibling Layout)
  - `*Page` — referenced from `page.tsx`, renders `AppPageLayout` itself (used when no shared layout exists)
- **Filename matches component name**: The file must match the component (e.g., `ProductLayout.tsx` for `ProductLayout`)
- **Layout + View pattern**: When a route has a `layout.tsx` and nested pages, use a `*Layout` component in `layout.tsx` and `*View` components in each `page.tsx`. The Layout renders `AppPageLayout`; Views render only inner content.

  ```tsx
  // layout.tsx — delegates to ProductLayout (renders AppPageLayout)
  export default async ({ children, params }) => {
    const { workspaceTag, productId } = await params;
    return (
      <ProductLayout workspaceTag={workspaceTag} productId={productId}>
        {children}
      </ProductLayout>
    );
  };

  // page.tsx — delegates to ProductOverviewView (no AppPageLayout)
  export default () => <ProductOverviewView />;
  ```

**AppPageLayout Content Pattern**:

- Every entity detail page (`*Page` or `*Layout`) uses `AppPageLayout` with a consistent content structure:
  1. **Breadcrumbs** — passed as the `title` prop via `PageBreadcrumbs` (not a plain string). Provides navigation hierarchy (root → parent → current entity)
  2. **Timeline** (optional) — entity activity timeline, rendered as the first child inside `children`
  3. **Header** — metadata chips (`HeaderChip` + `HeaderChipDivider`) wrapped in `PageSection`. Shows editable entity fields (type, priority, assignee, dates, etc.). Passed via the `header` prop or rendered inline in `children`. Never use sidebar forms or standalone inputs for metadata — always use header chips.
  4. **Content** — main content area. For editor pages, use `PageContentEditorSection`. For list/table pages, render directly
- Additional common props: `icon` (entity type icon), `authorId` (auto-displays "by Author" below breadcrumbs), `actions` (top-right buttons)
- **Autosave, not manual save**: Entity detail pages use `useAutoSave` for persistence. Never use `<Form>` with a submit button for editing existing entities. If destructive actions (delete) are needed, place them in `actions` prop. Manual form submission (`<Form>` + save button) is only for creation pages (e.g., `AddFocusPage`).
- **Reuse shared table components**: When displaying lists of records, reuse existing table components like `ProductRecordsTable` with appropriate column configuration instead of building custom DataTable setups with inline column components.
  ```tsx
  // Good - follows the pattern
  <AppPageLayout
    authorId={entity.creatorId}
    header={
      <PageSection className="w-full">
        <EntityHeaderFields form={form} />
      </PageSection>
    }
    icon={entityIcon}
    title={
      <PageBreadcrumbs
        items={[
          { type: 'root', title: 'Products' },
          { type: 'product', value: product },
          { type: 'label', title: entity.title }
        ]}
      />
    }
  >
    <PageContentEditorSection
      form={form}
      onBlur={autoSave.saveContent}
      onContentChange={markContentDirty}
    />
  </AppPageLayout>
  ```
- **Add pages reuse entity detail components**: The "Add Entity" page (`/entity/add`) must use the **same content component** as the entity detail page (`/entity/[id]`). Never build a separate form-based add page with different UI. Instead:
  1. Extract a shared content component (e.g., `DomainContent`, `ProductSettingsContent`) that renders the full `AppPageLayout` with header chips
  2. The content component takes an entity prop and detects create vs edit mode via `entity.id` (falsy = create, truthy = edit)
  3. In create mode: show a "Create" button in `actions`, skip sections that require existing data (timeline, related tables). Each field change updates local state; submission collects all state and calls the `create` server action
  4. In edit mode: each field change calls the `update` server action directly (no submit button)
  5. The add page route creates a mock entity with default values and `id: 0`/`null`, then renders the shared content component

  ```tsx
  // Good - Add page reuses the same content component as detail page
  // AddDomainPage.tsx
  const domain: IDomain = { id: 0, title: '', color: 'crimson', ... };
  return <DomainContent domain={domain} />;

  // DomainPage.tsx (detail page)
  return <DomainContent domain={domain} />;

  // DomainContent.tsx (shared) - detects mode via domain.id
  const isCreateMode = !domain.id;

  // Bad - separate add page with different UI (Input, Textarea, button grids)
  // AddDomainPage.tsx
  return <form><Input label="Title" /><Textarea label="Description" />...</form>;
  ```

**Route Page/Layout Exports**:

- **Always use anonymous arrow functions**: Route `page.tsx` and `layout.tsx` files must use anonymous arrow function `export default`
- Next.js identifies routes by file path, so naming the function provides no value

  ```tsx
  // Good - simple route (no params)
  export default () => <FocusPage />;

  // Good - async route with params
  export default async ({
    params
  }: {
    params: Promise<{ workspaceTag: string }>;
  }) => {
    const { workspaceTag } = await params;
    // ...
  };

  // Bad - named function declaration
  export default function FocusRoute() {
    return <FocusPage />;
  }
  ```

**File Organization**:

- **One class per file**: Each file should contain only one class
- **Filename matches classname**: If a file contains a class, the filename must match the class name
  - Example: `class WorkspaceTools` → `WorkspaceTools.ts`
  - Example: `class AIRecordAssistantService` → `AIRecordAssistantService.ts`
- **Constructor parameter properties**: Use TypeScript's parameter properties for constructor parameters instead of manual assignment

  ```typescript
  // Good - automatic property declaration
  class MyService extends BaseService {
    constructor(private userId: number) {
      super();
    }
  }

  // Bad - manual assignment
  class MyService extends BaseService {
    #userId: number;

    constructor(userId: number) {
      super();
      this.#userId = userId;
    }
  }
  ```

- **Private fields**: For fields declared outside constructor, use JavaScript private fields (`#`) or TypeScript `private` for consistency with constructor parameters

**DataTable Column Components**:

- **All column components live in `components/columns/`**: Column components used with `DataTable` must be defined in this directory, not inside page components
- **One component per file**: Each column is a separate file named after the component
- **Generic columns take explicit props**: Columns should take explicit props (not `value: SomeEntity`). Use `withPayloadProps` at the usage site to map entity data to column props
- **Prefer generic columns**: When a column concept is reusable across entities (icon, title, focus, etc.), name it generically (e.g., `IconColumn`, `TitleColumn`, `FocusColumn`). Only prefix with entity name when the column renders entity-specific UI (e.g., `ProductRecordMetaColumn` renders `ProductRecordTypeChip`)
- **Memoize `components` objects**: Wrap the `components` object passed to `DataTable` in `useMemo` to avoid recreating `withPayloadProps` wrappers on every render
- **Shared helpers**: Non-component utilities (URL builders) also live in this directory (e.g., `productRecordUrl.ts`)
- **Barrel export**: All columns are re-exported from `components/columns/index.ts`

  ```tsx
  // Good - generic column with explicit props
  export const IconColumn: React.FC<{ icon: ReactNode }> = ({ icon }) => (
    <div className="flex w-full h-full items-center justify-center">{icon}</div>
  );

  // Good - entity-specific column with explicit props (renders entity-specific chip)
  export const ProductRecordMetaColumn: React.FC<{ type: RecordType }> = ({ type }) => (
    <ProductRecordTypeChip type={type} />
  );

  // Good - wiring with withPayloadProps at usage site
  const components = useMemo(() => ({
    icon: withPayloadProps(IconColumn, () => ({
      icon: <PaperPlaneTiltIcon size={22} />
    })),
    meta: withPayloadProps(ProductRecordMetaColumn, (r: IProductRecord) => ({
      type: r.type
    })),
    title: withPayloadProps(TitleColumn, (r: IProductRecord) => ({
      title: r.title,
      getHref: (appUrl) => getProductRecordUrl(appUrl, r)
    }))
  }), []);

  // Bad - column takes value: SomeEntity directly
  export const ProductRecordMetaColumn: React.FC<{ value: IProductRecord }> = ({ value }) => ...
  ```

**Timeline Components**:

- **All timeline components live in `components/timeline/`**: Timeline components, builders, and shared timeline UI must be placed in this directory, not inside page components or other component directories
- **Subdirectory per entity**: Each entity timeline lives in its own subdirectory (e.g., `components/timeline/ProductTimeline/`, `components/timeline/MilestoneTimeline/`)
- **Use `TimelineLayout`**: Every timeline component must use the `TimelineLayout` component as its root layout wrapper

**Chip Components**:

- **Organized by entity**: Each entity type has its own subdirectory under `components/chips/` (e.g., `user/`, `product/`, `focus/`, `product-record/`, `document/`)
- **Barrel exports**: Each subdirectory has an `index.ts`, re-exported from `components/chips/index.ts`
- **Three component types per entity**:
  - `EntityChip` — displays the value with popover details and optional `onRemove` (X button)
  - `EntityChipPlaceholder` — dashed-border chip that opens a selection popover with the entity's list component; has `onSelect` callback
  - `EntityChipPopover` — popover content showing entity details (used inside the chip)
- **`onRemove` pattern**: Every chip has `onRemove: (() => void) | null`. When provided, render an X button. All read-only usages pass `onRemove={null}`
- **`onChange` pattern** (type/category chips): Some chips have `onChange: ((value: T) => void) | null` for inline editing via popover listbox
- **Placeholder styling**: All placeholders use dashed border: `className="cursor-pointer font-mono border-dashed"` with `variant="bordered"` and `classNames={{ base: 'px-2 border-default-300 text-default-400' }}`
- **Controlled popover in placeholders**: Placeholders must use controlled `isOpen` state and call `setIsOpen(false)` after selection

**Page Component Directory Structure**:

- **Children in `components/` subdirectory**: Page components (e.g., `ProductPage/`) must keep child/section components in a `components/` subdirectory
- **Barrel export**: Export all child components from `components/index.ts`
- **Top-level files**: Only router-facing components (`*Layout`, `*View`, `*Page`) and `index.ts` belong at the root level. All other components go in `components/`
- **Subdirectory for complex components**: If a child component has its own sub-components or CSS modules, place it in a named subdirectory (e.g., `components/ProductMilestonesSection/ProductMilestonesSection.tsx`)
- **Flat file for simple components**: If a child component is a single file with no CSS or sub-components, place it directly under `components/` (e.g., `components/ProductTabs.tsx`)
- **Group by concern**: When `components/` contains many children, group related files into named subdirectories by concern (e.g., `tables/`, `reviews/`, `columns/`). Each subdirectory gets its own barrel `index.ts`. Simple standalone components remain flat in `components/`.

  ```
  // Good - Layout + View pattern (shared layout with nested pages)
  ProductPage/
    index.ts                          // re-exports router-facing components + components/
    ProductLayout.tsx                 // *Layout — used in layout.tsx, renders AppPageLayout
    ProductOverviewView.tsx           // *View — used in page.tsx, inner content only
    ProductSettingsView.tsx           // *View — used in page.tsx, inner content only
    components/
      index.ts                        // barrel export for all children
      ProductTabs.tsx                  // simple child (no sub-components/CSS)
      ProductDomainSection.tsx         // simple child
      ProductMilestonesSection/       // complex child (has CSS or sub-components)
        ProductMilestonesSection.tsx
        ProductMilestonesSection.module.css

  // Good - standalone Page (no shared layout needed)
  TeamPage/
    index.ts
    TeamPage.tsx                      // *Page — renders AppPageLayout itself

  // Good - grouped by concern
  AITaskReview/
    index.ts
    AITaskReview.tsx                   // main orchestrator
    utils.ts                          // shared utilities
    components/
      index.ts                        // barrel re-exports all subdirectories
      AITaskActions.tsx                // simple standalone child
      AITaskSidebar.tsx                // simple standalone child
      ReviewRecordsList.tsx            // simple standalone child
      columns/                        // grouped: column components
        index.ts
        TaskStatusActionColumn.tsx
        TaskTitleColumn.tsx
        TaskRecordIdColumn.tsx
      tables/                         // grouped: table components
        index.ts
        AIDocumentTaskTable.tsx
        AIProductTaskTable.tsx
      reviews/                        // grouped: review/detail components
        index.ts
        AIDocumentTaskReview.tsx
        AIProductTaskReview.tsx
        ReviewRecord.tsx
  ```

**React Hooks**:

- **Hooks should return data, not JSX**: Hooks should return state, callbacks, and computed values - never React elements
- **Use render props for multi-slot patterns**: When a component needs to provide multiple JSX outputs for different locations, use a render props pattern

  ```tsx
  // Good - component with render props
  function WorkflowReview({ children }: { children: (props: { sidebar: ReactNode; content: ReactNode }) => ReactNode }) {
    const [state, setState] = useState(...);
    const sidebar = <Sidebar ... />;
    const content = <Content ... />;
    return children({ sidebar, content });
  }

  // Usage
  <WorkflowReview>
    {({ sidebar, content }) => (
      <Layout sidebar={sidebar}>{content}</Layout>
    )}
  </WorkflowReview>

  // Bad - hook returning JSX
  function useWorkflowReview() {
    const [state, setState] = useState(...);
    return { sidebar: <Sidebar />, content: <Content /> }; // Anti-pattern
  }
  ```

**React Component Declaration**:

- **Always use arrow function with `React.FC`**: Components should be declared as `const ComponentName: React.FC<Props> = ({...}) => {...};`
- **Never use function declarations for components**: Avoid `function ComponentName({...}): React.ReactNode`

  ```tsx
  // Good
  export const MyComponent: React.FC<MyComponentProps> = ({ prop1, prop2 }) => {
    return <div>{prop1}</div>;
  };

  // Bad
  export function MyComponent({
    prop1,
    prop2
  }: MyComponentProps): React.ReactNode {
    return <div>{prop1}</div>;
  }
  ```

**Icons**:

- **Always use Phosphor Icons**: Use icons from `@phosphor-icons/react` package
- **Always use Icon suffix**: Import icons with the `Icon` suffix (e.g., `FloppyDiskIcon`, `PlusIcon`, `CheckIcon`)
- **Never use custom SVG**: Do not create inline SVG icons

  ```typescript
  // Good
  import { MagnifyingGlassIcon, CheckIcon, XIcon } from '@phosphor-icons/react';

  <MagnifyingGlassIcon size={24} />

  // Bad - no Icon suffix
  import { MagnifyingGlass } from '@phosphor-icons/react';

  // Bad - custom SVG
  <svg className="w-6 h-6" fill="none" stroke="currentColor">
    <path d="..." />
  </svg>
  ```

**UI Components**:

- **Always use HeroUI components**: For basic UI elements (Button, Input, Modal, etc.), always use components from `@heroui/react`
- **Never use native HTML elements**: Do not use native `<button>`, `<input>`, `<select>` etc. when HeroUI provides an equivalent

**Date Inputs**:

- **Always use DatePicker component**: For date inputs, always use `DatePicker` from `@heroui/react` instead of `Input type="date"`
- Use `@internationalized/date` for date value parsing/formatting
- Handle ISO date strings that may include time component by slicing to first 10 characters

  ```tsx
  // Good
  import { DatePicker } from '@heroui/react';
  import { parseDate } from '@internationalized/date';

  // Helper to handle both "2026-02-05" and "2026-02-05T00:00:00" formats
  const parseDateString = (dateStr: string) => parseDate(dateStr.slice(0, 10));

  <DatePicker
    label="Date"
    value={date ? parseDateString(date) : null}
    onChange={(d) => setDate(d?.toString() ?? '')}
  />

  // Bad - native date input
  <Input type="date" value={date} onValueChange={setDate} />
  ```

**Form State Management**:

- **Prefer `useFormState` over local `useState`**: When a component manages multiple related values (e.g., dates, selections, text fields), always use `useFormState` instead of separate `useState` calls. This applies to dialogs, modals, and any component with a submit/apply action
- **Always use form API for all form fields**: When using `useFormState`, store all form values in the form state, not in separate `useState` calls
- This ensures consistent state management and access to form utilities (validation, submission, errors)

  ```tsx
  // Good - all fields in form state
  const form = useFormState<{ title: string; content: JSONContent }>({
    title: '',
    content: { type: 'doc', content: [] }
  });

  <Input
    value={form.values.title}
    onValueChange={(v) => form.setFieldValue('title', v)}
  />;

  // Bad - mixing useState with form state
  const form = useFormState<{ title: string }>({ title: '' });
  const [content, setContent] = useState<JSONContent>({
    type: 'doc',
    content: []
  }); // Don't do this
  ```

- **Pass initial values directly to form hooks**: When a form needs default values (e.g., a default date), pass them as arguments to the form hook instead of setting them via `useEffect`. This avoids an unnecessary extra render cycle.

  ```tsx
  // Good - pass initial value directly
  const form = useReleaseForm({
    productId: product.id,
    targetDate: dayjs().add(7, 'day').format('YYYY-MM-DD')
  });

  // Bad - setting initial value via useEffect (causes extra render)
  const form = useReleaseForm({ productId: product.id });
  useEffect(() => {
    form.setFieldValue(
      'targetDate',
      dayjs().add(7, 'day').format('YYYY-MM-DD')
    );
  }, []);
  ```

**Lifted Form State Pattern**:

- When a parent component needs access to form state (e.g., for footer buttons in a modal), lift `useFormState` to the parent
- Pass the form object as a prop to the child form component - the child can use `form.setFieldValue` directly
- Do NOT pass individual callbacks for each field change - the form prop provides everything needed

  ```tsx
  // Good - parent owns form state, child uses form.setFieldValue
  const ParentModal: React.FC = () => {
    const form = useFormState<IFormValues>({ title: '', content: EMPTY });

    return (
      <Modal>
        <ModalBody>
          <ChildForm form={form} />
        </ModalBody>
        <ModalFooter>
          <Button isLoading={form.isPending} onPress={handleSubmit}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  // Child component - uses form.setFieldValue directly
  const ChildForm: React.FC<{ form: UseFormState<IFormValues> }> = ({
    form
  }) => {
    return (
      <Input
        value={form.values.title}
        onValueChange={(v) => form.setFieldValue('title', v)}
      />
    );
  };

  // Bad - passing individual callbacks
  const ParentModal: React.FC = () => {
    const form = useFormState<IFormValues>({ title: '' });
    const handleTitleChange = (v: string) => form.setFieldValue('title', v); // Unnecessary

    return <ChildForm onTitleChange={handleTitleChange} />; // Don't do this
  };
  ```

**TipTap Content Serialization**:

- When saving TipTap JSONContent, always use `JSON.parse(JSON.stringify(content))` on the **frontend** before sending to the backend
- This ensures all `attrs` properties are preserved correctly during serialization
- Direct assignment may lose nested attributes due to reference issues

  ```typescript
  // Good - serialize on frontend before calling server action
  const serializedContent = JSON.parse(JSON.stringify(content));
  await updateRecord({ content: serializedContent });

  // Bad - may lose nested attrs
  await updateRecord({ content });
  ```

**Error Handling (Backend)**:

- **Never use native errors**: NEVER throw `new Error()`, `new TypeError()`, etc.
- **Always use custom errors**: Use `ServiceError` with appropriate `ServiceErrorCode`
- **Provide context**: Use `.withMessage()` to add descriptive error messages
- **Chain errors**: Use `.withParentError()` to preserve error stack

  ```typescript
  // Good
  throw createServiceError(ServiceErrorCode.DBClientUnexpectedResult)
    .withMessage('Document not found')
    .withParentError(error);

  // Bad
  throw new Error('Document not found');
  ```

**Error Display (Frontend)**:

- **Always use ErrorBox component**: For displaying errors in the UI, especially backend-related errors
- ErrorBox accepts the error object directly and handles formatting

  ```tsx
  // Good
  {
    error && <ErrorBox error={error} />;
  }

  // Bad - manual error message display
  {
    error && <div className="text-red-500">{error.message}</div>;
  }
  ```

**Developer Comments (xai markers)**:

- Developers leave `// xai:` or `xai:` or `xai -` or `xai ->` comments to mark changes THEY made that require updates elsewhere in the codebase
- The xai comment describes what the developer changed - Claude must update OTHER files to align with those changes
- **NEVER revert the developer's changes** - the code near the xai comment is the source of truth
- When asked to "fix xai comments", search for all `xai` comments, update other code to match, then remove the comment
- Example: `// xai: changed prop from userId to id` → update all usages of this prop in other files to use `id`, then remove the comment
- Example: `// xai: renamed interface` → update all imports and usages of the old interface name, then remove the comment

**Layout Spacing**:

- **Parent controls children spacing**: Prefer setting `p-*` and `gap-*` on parent containers instead of `px-*`/`py-*` on each child
- This centralizes layout control and makes spacing consistent

  ```tsx
  // Good - parent controls spacing
  <div className="flex flex-col gap-4 p-6">
    <Header />
    <Content />
    <Footer />
  </div>

  // Bad - each child manages its own padding
  <div className="flex flex-col">
    <Header className="px-6 pt-6" />
    <Content className="px-6 py-4" />
    <Footer className="px-6 pb-6" />
  </div>
  ```

**Empty State Rendering**:

- **Single root layout**: Never render separate root layout components for empty and non-empty states
- Use a single layout wrapper with conditional children instead

  ```tsx
  // Good - single AppPageLayout with conditional content
  <AppPageLayout title="Roadmap">
    {items.length === 0 ? <EmptyState /> : <Content items={items} />}
  </AppPageLayout>;

  // Bad - separate root components for each state
  if (items.length === 0) {
    return (
      <AppPageLayout title="Roadmap">
        <EmptyState />
      </AppPageLayout>
    );
  }
  return (
    <AppPageLayout title="Roadmap">
      <Content items={items} />
    </AppPageLayout>
  );
  ```

**Categorization Loops**:

- **Use `forEach` + `switch`**: When iterating over a collection to categorize/bucket items by type, use `.forEach()` with a `switch` statement instead of `for...of` with `if/else` chains

  ```typescript
  // Good - forEach + switch for categorization
  items.forEach((item) => {
    switch (item.type) {
      case ItemType.Document:
        documents.push(item);
        break;
      case ItemType.Product:
        products.push(item);
        break;
    }
  });

  // Bad - for...of with if/else
  for (const item of items) {
    if (item.type === ItemType.Document) {
      documents.push(item);
    } else {
      products.push(item);
    }
  }
  ```

**Simplicity over tracking state**:

- When a behavior can be derived from existing data (e.g., checking if a value is null), prefer that over introducing new state, refs, or callback props to track changes
- Avoid adding props/state just to track whether something was "manually edited" when the current value itself is sufficient

  ```tsx
  // Good - derive from existing data
  if (!form.values.tag) {
    form.setFieldValue('tag', generateTag(title));
  }

  // Bad - extra ref to track manual edits
  const manuallyEdited = useRef(false);
  if (!manuallyEdited.current) {
    form.setFieldValue('tag', generateTag(title));
  }
  ```

**Readability First**:

- Keep code readable and maintainable above all else
- Extract logic into functions if it improves readability, even if not reused
- Extract simple components to keep parent components clean
- Prefer self-documenting code with clear names over comments

**Extract Conditional Render Views**:

- When a component has conditional render paths (success, error, loading, empty states), extract each into a separate component file
- This keeps the main component focused and makes each view testable independently

  ```tsx
  // Good - extracted to separate files
  if (savedRecords) {
    return <SavedRecordsView records={savedRecords} />;
  }
  if (error) {
    return <ErrorView error={error} />;
  }

  // Bad - large inline conditional renders
  if (savedRecords) {
    return (
      <AppPageLayout>
        <DataTable ... /> {/* 50+ lines of JSX */}
      </AppPageLayout>
    );
  }
  ```

**Examples**:

```typescript
// Good - extracted for readability
function isEligibleForDiscount(user: User, product: Product): boolean {
  return user.isPremium && product.price > 100 && !product.isOnSale;
}

// Instead of inline:
if (user.isPremium && product.price > 100 && !product.isOnSale) { ... }
```

```tsx
// Good - simple component extracted
function EmptyState({ message }: { message: string }) {
  return <div className="text-gray-500">{message}</div>;
}

// Use in parent component
{
  items.length === 0 ? (
    <EmptyState message="No items found" />
  ) : (
    <ItemList items={items} />
  );
}
```

## Color System

All UI color in this app goes through **HeroUI v3 semantic tokens** (`bg-surface`, `text-foreground`, `text-muted`, `border-border`, `text-success`, `bg-danger-soft`, etc.). Raw Tailwind palette colors (`bg-zinc-*`, `text-red-500`, etc.) are **banned in new code**.

Quick rules:
- Panel backgrounds: `<Surface>` or `bg-surface` (nested: `bg-surface-secondary`/`tertiary`)
- Page background: `bg-background`
- Text: `text-foreground` (primary), `text-muted` (secondary)
- Borders: `border-border` (prominent), `border-separator` (subtle)
- Intents: `accent` / `success` / `warning` / `danger` (+ `-soft` variants for chips)
- AI-styled panels: `border-2 border-ai shadow-ai`
- Elevated containers: `shadow-container`

HeroUI v3 does NOT have numeric scales like `text-danger-400`, `bg-default-300`, `text-foreground-500` — they silently render as nothing. Always use the base token.

Documented exceptions (keep raw colors): `client-shared/domain.tsx`, `client-shared/workspace.tsx`, `client-shared/users.ts`, `components/LandingPage/**`, `components/PricingPage/**`, syntax highlighting rows of `components/ContentEditor/ContentInput.module.css`.

Full catalog + decision tree + lint rule: see [`docs/COLOR_SYSTEM.md`](docs/COLOR_SYSTEM.md).

## CLI Tool (xpm)

The `xpm` CLI (`cli/` directory) provides programmatic access to workspace data via REST API. Use direct commands (not interactive browse mode) when querying or creating entities.

```bash
# Run (executable with shebang, no `node` prefix needed)
cli/dist/index.js <command>

# Build first if dist is missing
cd cli && yarn build
```

### Commands

| Command                                                        | Description                |
| -------------------------------------------------------------- | -------------------------- |
| `cli/dist/index.js whoami`                                     | Current user info          |
| `cli/dist/index.js workspaces list`                            | List workspaces            |
| `cli/dist/index.js products list -w <tag>`                     | List products in workspace |
| `cli/dist/index.js records list -w <tag> [-p <productTag>]`    | List records               |
| `cli/dist/index.js documents list -w <tag>`                    | List documents             |
| `cli/dist/index.js focuses list -w <tag>`                      | List focuses (sprints)     |
| `cli/dist/index.js domains list -w <tag>`                      | List domains               |
| `cli/dist/index.js milestones list -w <tag>`                   | List milestones            |
| `cli/dist/index.js users list -w <tag>`                        | List workspace users       |
| `cli/dist/index.js prompt -w <tag> [-p <productTag>] "<text>"` | Create entities via AI     |
| `cli/dist/index.js check-ins start -w <tag> [scope]`           | Start a check-in — `scope` is at most one of `-f <focusId>`, `-p <productTag>`, `-t <ticketId>`, `-d <documentId>` (omit all for workspace scope) |

### Important

- **Never use interactive browse mode** (no args) — it requires stdin interaction and will hang
- Always use direct commands with flags
- Requires authentication first: `cli/dist/index.js login --host <url>`
- Architecture details: `cli/ARCHITECTURE.md`

## TODO

- **Remove column-level actions from GridBuilder**: `IBaseGridColumn.actions` and `#buildActionsRow()` are redundant now that row-level actions exist on `IBaseGridRow.actions`. Both `FocusGridBuilder` and `StreamGridBuilder` create a synthetic single column just to hold actions — migrate them to use `row.actions` instead, then remove `actions` from `IBaseGridColumn` and delete `#buildActionsRow()` from `GridBuilder`.
