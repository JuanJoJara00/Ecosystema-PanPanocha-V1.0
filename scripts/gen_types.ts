/// <reference types="node" />
/**
 * Script to generate Supabase TypeScript types using environment variables.
 * Cross-platform compatible (Windows/Linux/Mac).
 * Run with: npx ts-node --project scripts/tsconfig.json scripts/gen_types.ts
 */
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Find project root by looking for package.json
 */
function findProjectRoot(startPath: string): string {
    let current = startPath;
    while (current !== path.parse(current).root) {
        if (fs.existsSync(path.join(current, 'package.json'))) {
            return current;
        }
        current = path.dirname(current);
    }
    throw new Error(`Could not find project root (package.json) starting from ${startPath}.`);
}

const projectRoot = findProjectRoot(__dirname);
const envPath = path.join(projectRoot, 'apps/portal/.env.local');
const typesOutputPath = path.join(projectRoot, 'apps/portal/src/types/supabase.ts');

// Load environment variables from .env.local if present
if (fs.existsSync(envPath)) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
            if (match) {
                const key = match[1];
                let value = match[2] ? match[2].trim() : '';
                if (value.length > 1 &&
                    ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'")))) {
                    value = value.slice(1, -1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log(`Loaded env from: ${envPath}`);
    } catch (e) {
        console.warn(`Warning: Failed to parse ${envPath}`);
    }
}

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
    console.error('❌ Error: SUPABASE_PROJECT_ID is not set.');
    console.error('Please set it in your environment or in apps/portal/.env.local');
    process.exit(1);
}

console.log(`Generating types for project: ${projectId}`);

// Command to run
// using --project-id flag with the value
const command = `npx supabase gen types typescript --project-id ${projectId} > "${typesOutputPath}"`;

console.log(`Executing: ${command}`);

execAsync(command)
    .then(() => {
        console.log('✅ Types generated successfully!');
        console.log(`Output: ${typesOutputPath}`);
    })
    .catch((error) => {
        console.error('❌ Error generating types:', error.message);
        if (error.stderr) console.error(error.stderr);
        process.exit(1);
    });
