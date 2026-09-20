// Runs the real Next.js router and authorization code in an isolated temp copy.
// Only Clerk identity/UI and Prisma I/O are replaced. No .env files are copied.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync } from "node:fs"
import { cp, mkdtemp, symlink, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const fixture = await mkdtemp(path.join(tmpdir(), "opsflow-route-check-"))
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browserPath =
  process.env.BROWSER_PATH ??
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].find(existsSync)
assert.ok(browserPath, "Set BROWSER_PATH to a Chromium browser executable")
async function freePort() {
  const server = createServer()
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}
const port = await freePort()
const debugPort = await freePort()
const origin = `http://127.0.0.1:${port}`
await cp(path.join(root, "src"), path.join(fixture, "src"), { recursive: true })
await cp(path.join(root, "tests/browser"), path.join(fixture, "fixtures"), {
  recursive: true,
})
for (const name of ["package.json", "tsconfig.json", "postcss.config.mjs"])
  await cp(path.join(root, name), path.join(fixture, name))
await symlink(
  path.join(root, "node_modules"),
  path.join(fixture, "node_modules"),
  process.platform === "win32" ? "junction" : "dir"
)
await writeFile(
  path.join(fixture, "next.config.mjs"),
  `
import path from 'node:path';
export default {
  reactCompiler: true,
  webpack(config, {webpack}) {
    config.resolve.alias['@clerk/nextjs/server$'] = path.resolve('fixtures/clerk-server.fixture.ts');
    config.resolve.alias['@clerk/nextjs$'] = path.resolve('fixtures/clerk-client.fixture.tsx');
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/(^|[/\\\\])prisma(\\.ts)?$/, path.resolve('fixtures/prisma.fixture.ts')));
    return config;
  }
};
`
)
// Environment credentials are neither copied nor passed into the fixture process.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|APPDATA|LOCALAPPDATA|HOME|USERPROFILE|NUMBER_OF_PROCESSORS)$/i.test(
      key
    )
  )
)
env.NEXT_TELEMETRY_DISABLED = "1"
let logs = ""
console.log(`Building isolated Next.js route fixture: ${fixture}`)
const build = spawn(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  { cwd: fixture, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
)
for (const stream of [build.stdout, build.stderr])
  stream.on("data", (data) => {
    logs += data.toString()
  })
const [buildCode] = await once(build, "exit")
await writeFile(path.join(fixture, "next.log"), logs)
assert.equal(buildCode, 0, logs)
const app = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { cwd: fixture, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
)
for (const stream of [app.stdout, app.stderr])
  stream.on("data", (data) => {
    logs += data.toString()
  })
let browser, ws
let checks = 0
try {
  console.log(`Isolated Next.js route fixture: ${fixture}`)
  for (let i = 0; i < 120; i++) {
    if (app.exitCode !== null) throw new Error(logs)
    try {
      const response = await fetch(origin + "/upload")
      if (response.status === 200) break
      if (i === 119) throw new Error(`Startup HTTP ${response.status}`)
    } catch {
      if (i === 119) throw new Error("Next.js fixture did not start\n" + logs)
    }
    await pause(500)
  }
  browser = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${path.join(fixture, "browser-profile")}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" }
  )
  let target
  for (let i = 0; i < 60; i++) {
    try {
      target = (
        await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()
      ).find((item) => item.type === "page")
      if (target) break
    } catch {}
    await pause(250)
  }
  assert.ok(target, "Headless browser did not start")
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await once(ws, "open")
  let id = 0
  const pending = new Map()
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error)
        request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const call = ++id
      pending.set(call, { resolve, reject })
      ws.send(JSON.stringify({ id: call, method, params }))
    })
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    assert.ok(
      !response.exceptionDetails,
      JSON.stringify(response.exceptionDetails)
    )
    return response.result.value
  }
  const until = async (expression) => {
    for (let i = 0; i < 160; i++) {
      if (await evaluate(expression)) return
      await pause(250)
    }
    throw new Error(
      `Browser condition timed out: ${expression}\n` + logs.slice(-6000)
    )
  }
  const mode = async (value) =>
    send("Network.setCookie", {
      name: "workspace-test",
      value,
      url: origin,
      path: "/",
    })
  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await writeFile(
      path.join(fixture, name + ".png"),
      Buffer.from(result.data, "base64")
    )
  }
  const destinations = [
    ["/dashboard", "Overview"],
    ["/upload", "Let your invoices do the talking."],
    ["/invoices", "Invoices"],
    ["/orders", "Purchase orders"],
    ["/exceptions", "Exceptions"],
    ["/settings", "Organization members"],
  ]
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  for (const scenario of ["missing", "denied", "authorized"]) {
    await mode(scenario)
    for (const [route, title] of destinations) {
      const expected =
        scenario !== "authorized" && route !== "/upload"
          ? "Workspace access required"
          : title
      const response = await fetch(origin + route, {
        headers: { cookie: `workspace-test=${scenario}` },
      })
      assert.equal(response.status, 200, `${scenario} ${route} HTTP status`)
      const html = await response.text()
      assert.ok(html.includes(expected), `${scenario} ${route} server content`)
      assert.ok(
        !html.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
        `${scenario} ${route} notFound marker`
      )
      await send("Page.navigate", { url: origin + route })
      await until(
        `document.querySelector('main h1')?.textContent === ${JSON.stringify(expected)}`
      )
      assert.equal(
        await evaluate(
          `document.querySelector('nav a[aria-current="page"]')?.getAttribute('href')`
        ),
        route
      )
      assert.ok(
        await evaluate("document.documentElement.scrollWidth <= innerWidth")
      )
      if (scenario !== "authorized")
        assert.ok(
          !(
            await evaluate("document.querySelector('main').innerText")
          ).includes("Test vendor")
        )
      checks++
      console.log(`PASS direct ${scenario} ${route}`)
      if (scenario === "authorized" || route === "/dashboard")
        await screenshot(`${scenario}-${route.slice(1)}`)
    }
    for (const [route, title] of destinations) {
      const expected =
        scenario !== "authorized" && route !== "/upload"
          ? "Workspace access required"
          : title
      await evaluate(`document.querySelector('nav a[href="${route}"]').click()`)
      await until(
        `location.pathname === ${JSON.stringify(route)} && document.querySelector('main h1')?.textContent === ${JSON.stringify(expected)}`
      )
      checks++
      console.log(`PASS sidebar ${scenario} ${route}`)
    }
  }
  // Same-path organization selection must refresh the data, not strand a cached denial.
  await mode("missing")
  await send("Page.navigate", { url: origin + "/invoices" })
  await until(
    `document.querySelector('main h1')?.textContent === 'Workspace access required'`
  )
  await evaluate(`document.querySelector('main button').click()`)
  await until(
    `location.pathname === '/invoices' && document.querySelector('main').innerText.includes('Invoice org-a')`
  )
  checks++
  console.log("PASS organization selection returns to requested page")
  await mode("tenant-b")
  await send("Page.reload")
  await until(
    `document.querySelector('main').innerText.includes('Invoice org-b')`
  )
  assert.ok(
    !(await evaluate("document.querySelector('main').innerText")).includes(
      "Invoice org-a"
    )
  )
  checks++
  console.log("PASS organization switching does not leak prior tenant data")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: false,
  })
  for (const [route, title] of destinations) {
    await evaluate(`document.querySelector('nav a[href="${route}"]').click()`)
    await until(
      `location.pathname === ${JSON.stringify(route)} && document.querySelector('main h1')?.textContent === ${JSON.stringify(title)}`
    )
    assert.ok(
      await evaluate("document.documentElement.scrollWidth <= innerWidth")
    )
    checks++
    console.log(`PASS tablet sidebar ${route}`)
  }
  for (const [route] of destinations) {
    const response = await fetch(origin + route, {
      redirect: "manual",
      headers: { cookie: "workspace-test=anonymous" },
    })
    const html = await response.text()
    assert.ok(
      response.headers.get("location")?.includes("/sign-in") ||
        html.includes("NEXT_REDIRECT"),
      `Anonymous ${route} must redirect`
    )
    checks++
  }
  const unknown = await fetch(origin + "/this-route-does-not-exist")
  assert.equal(unknown.status, 404)
  checks++
  console.log(
    `PASS ${checks} real-router browser/HTTP checks. Screenshots: ${fixture}`
  )
  await writeFile(path.join(fixture, "checks.txt"), `${checks} checks passed\n`)
  await send("Browser.close").catch(() => {})
} finally {
  ws?.close()
  browser?.kill()
  app.kill()
  await writeFile(path.join(fixture, "next.log"), logs)
}
