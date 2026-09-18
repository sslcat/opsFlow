export function getRequiredArgument(name: string) {
  const argumentIndex = process.argv.indexOf(`--${name}`)
  const value = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required argument: --${name}`)
  }

  return value
}

export function getOptionalArgument(name: string) {
  const argumentIndex = process.argv.indexOf(`--${name}`)
  const value = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined

  return value && !value.startsWith("--") ? value : undefined
}
