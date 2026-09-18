import { existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const sourceRoot = path.resolve(process.cwd(), "src")

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/navigation") {
    return nextResolve("next/navigation.js", context)
  }

  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context)
  }

  const basePath = path.resolve(sourceRoot, specifier.slice(2))
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ]
  const resolvedPath = candidates.find((candidate) => existsSync(candidate))

  if (!resolvedPath) {
    throw new Error(`Could not resolve test import: ${specifier}`)
  }

  return {
    shortCircuit: true,
    url: pathToFileURL(resolvedPath).href,
  }
}
