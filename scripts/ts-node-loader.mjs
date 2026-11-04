import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const TS_EXTENSIONS = new Set(['.ts', '.tsx']);
const CSS_EXTENSIONS = new Set(['.css']);

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const basePath = path.join(process.cwd(), 'src', specifier.slice(2));
    const baseUrl = pathToFileURL(basePath).href;

    try {
      return await defaultResolve(baseUrl, context, defaultResolve);
    } catch (error) {
      try {
        return await defaultResolve(pathToFileURL(`${basePath}.ts`).href, context, defaultResolve);
      } catch {
        try {
          return await defaultResolve(pathToFileURL(`${basePath}.tsx`).href, context, defaultResolve);
        } catch {
          try {
            return await defaultResolve(pathToFileURL(path.join(basePath, 'index.ts')).href, context, defaultResolve);
          } catch {
            return defaultResolve(pathToFileURL(path.join(basePath, 'index.tsx')).href, context, defaultResolve);
          }
        }
      }
    }
  }

  const extension = path.extname(specifier);
  if (!extension && (specifier.startsWith('.') || specifier.startsWith('/'))) {
    try {
      return await defaultResolve(specifier, context, defaultResolve);
    } catch (error) {
      try {
        return await defaultResolve(`${specifier}.ts`, context, defaultResolve);
      } catch {
        return defaultResolve(`${specifier}.tsx`, context, defaultResolve);
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  const extension = `.${new URL(url).pathname.split('.').pop()}`;
  if (CSS_EXTENSIONS.has(extension)) {
    return {
      format: 'module',
      source: 'export default {};',
      shortCircuit: true,
    };
  }
  if (TS_EXTENSIONS.has(extension)) {
    const source = await readFile(new URL(url), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return {
      format: 'module',
      source: output.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
