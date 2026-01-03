# Contributing

## Database & Type Safety

This project uses Supabase as its backend. To maintain type safety and ensure the local codebase matches the remote database schema, please follow these rules:

### Generating TypeScript Types

Whenever you make changes to the Supabase database schema (or after running migrations), you **MUST** regenerate the TypeScript types to prevent drift.

We have provided a utility script for this:

```bash
pnpm gen:types
```

This command runs:
`npx supabase gen types typescript --project-id dafdejwjgieiuazxmzba > apps/portal/src/types/supabase.ts`

### Workflow for Schema Changes

1.  **Modify DB**: Apply your changes to the Supabase database (or run migrations).
2.  **Generate Types**: Run `pnpm gen:types` in the project root.
3.  **Commit**: Commit both your code changes and the updated `apps/portal/src/types/supabase.ts` file.

> **Note**: Failure to update types may cause build errors in CI/CD pipelines.
