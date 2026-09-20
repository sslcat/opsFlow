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
      userGesture: true,
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
  // Purchase orders use the real POST route and permission resolver with fake storage.
  await mode("authorized")
  await send("Page.navigate", { url: origin + "/orders" })
  await until(
    `document.querySelector('main h1')?.textContent === 'Purchase orders'`
  )
  assert.equal(
    await evaluate(
      `document.querySelector('main').innerText.includes('Create purchase order')`
    ),
    false
  )
  const deniedCreate = await fetch(origin + "/api/orders", {
    method: "POST",
    headers: {
      cookie: "workspace-test=authorized",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ poNumber: "FORBIDDEN", quantity: 1, unitPrice: 0 }),
  })
  assert.equal(deniedCreate.status, 403)
  checks++
  console.log("PASS read-only user has no create action and cannot POST")
  await mode("creator")
  await send("Page.navigate", { url: origin + "/orders" })
  await until(
    `document.querySelector('main').innerText.includes('No purchase orders yet')`
  )
  const openOrder = async () =>
    until(`(() => {
    if (!document.querySelector('dialog')?.open) {
      document.querySelector('main button')?.focus();
      document.querySelector('main button')?.click();
    }
    return document.querySelector('dialog')?.open;
  })()`)
  const fillOrder = async (values) =>
    evaluate(`(() => {
    for (const [name, value] of Object.entries(${JSON.stringify(values)})) {
      const input = document.querySelector('dialog [name="' + name + '"]');
      input.value = value;
      input.dispatchEvent(new Event('input', {bubbles: true}));
    }
  })()`)
  const submitOrder = () =>
    evaluate(`document.querySelector('dialog button[type="submit"]').click()`)
  await openOrder()
  assert.equal(await evaluate("document.activeElement.id"), "po-number")
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    modifiers: 8,
    windowsVirtualKeyCode: 9,
  })
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    modifiers: 8,
    windowsVirtualKeyCode: 9,
  })
  assert.ok(
    await evaluate(
      `document.activeElement === document.body || document.querySelector('dialog').contains(document.activeElement)`
    )
  )
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  await until(`!document.querySelector('dialog').open`)
  assert.ok(
    await evaluate(
      `document.activeElement === document.querySelector('main button')`
    )
  )
  checks++
  console.log(
    "PASS dialog focus, keyboard containment, Escape and focus restoration"
  )
  await openOrder()
  const validOrder = {
    poNumber: "PO-LOCAL-E2E-1001",
    vendorName: "Acme Supplies",
    itemCode: "ITEM-ABC",
    quantity: "100",
    unitPrice: "10",
    expectedDate: "2026-10-01",
  }
  await fillOrder(validOrder)
  for (const invalid of [
    { poNumber: "   " },
    { quantity: "" },
    { quantity: "0" },
    { quantity: "1.5" },
    { quantity: "2147483648" },
    { unitPrice: "" },
    { unitPrice: "-1" },
  ]) {
    await fillOrder({ ...validOrder, ...invalid })
    assert.equal(
      await evaluate(`document.querySelector('dialog form').checkValidity()`),
      false
    )
    await submitOrder()
    assert.equal(
      await evaluate(
        `document.querySelector('dialog form').getAttribute('aria-busy')`
      ),
      "false"
    )
    checks++
  }
  await fillOrder(validOrder)
  await screenshot("create-order-tablet")
  assert.ok(
    await evaluate("document.documentElement.scrollWidth <= innerWidth")
  )
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await screenshot("create-order-desktop")
  // An expired permission must still be enforced after the form has opened.
  await mode("authorized")
  await submitOrder()
  await until(
    `document.querySelector('dialog [role="alert"]')?.textContent.includes('permission')`
  )
  assert.equal(
    await evaluate(`document.querySelector('[name="poNumber"]').value`),
    validOrder.poNumber
  )
  checks++
  await mode("creator")
  await fillOrder({ poNumber: "FAIL-SERVER" })
  await submitOrder()
  await until(
    `document.querySelector('dialog [role="alert"]')?.textContent.includes("couldn't confirm")`
  )
  await until(
    `document.activeElement === document.querySelector('dialog [role="alert"]')`
  )
  await screenshot("create-order-error")
  checks++
  await evaluate(
    `Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Check purchase orders').click()`
  )
  await until(`!document.querySelector('dialog').open`)
  await openOrder()
  assert.equal(
    await evaluate(`document.querySelector('[name="poNumber"]').value`),
    "FAIL-SERVER"
  )
  checks++
  await fillOrder(validOrder)
  await evaluate(`(() => {
    const original = window.fetch;
    window.fetch = () => {
      window.fetch = original;
      return Promise.resolve(new Response('<html>Unexpected response</html>', {status: 200}));
    };
  })()`)
  await submitOrder()
  await until(
    `document.querySelector('dialog [role="alert"]')?.textContent.includes("couldn't confirm")`
  )
  checks++
  await evaluate(`(() => {
    const original = window.fetch;
    window.fetch = (...args) => {
      window.fetch = original;
      return Promise.reject(new TypeError('Failed to fetch'));
    };
  })()`)
  await submitOrder()
  await until(
    `document.querySelector('dialog [role="alert"]')?.textContent.includes('Connection interrupted')`
  )
  checks++
  await submitOrder()
  await until(
    `document.querySelector('dialog form').getAttribute('aria-busy') === 'true'`
  )
  assert.ok(
    await evaluate(
      `document.querySelector('dialog fieldset').disabled && document.querySelector('dialog button[type="submit"]').disabled`
    )
  )
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  assert.ok(
    await evaluate(`document.querySelector('dialog').open`),
    JSON.stringify(
      await evaluate(
        `({busy: document.querySelector('dialog form').getAttribute('aria-busy'), status: document.querySelector('main [role="status"]').textContent, error: document.querySelector('dialog [role="alert"]')?.textContent})`
      )
    )
  )
  await until(
    `!document.querySelector('dialog').open && document.querySelector('tbody')?.innerText.includes('PO-LOCAL-E2E-1001')`
  )
  assert.ok(
    await evaluate(
      `document.querySelector('main [role="status"]').textContent.includes('created')`
    )
  )
  await screenshot("create-order-success")
  checks++
  const savedOrders = await (
    await fetch(origin + "/api/orders", {
      headers: { cookie: "workspace-test=creator" },
    })
  ).json()
  assert.equal(
    savedOrders.orders.length,
    1,
    "Failed or repeated submits must not create records"
  )
  assert.deepEqual(
    savedOrders.orders.map(
      ({
        poNumber,
        vendorName,
        itemCode,
        quantity,
        unitPrice,
        expectedDate,
        organizationId,
      }) => ({
        poNumber,
        vendorName,
        itemCode,
        quantity,
        unitPrice,
        expectedDate,
        organizationId,
      })
    ),
    [
      {
        ...validOrder,
        quantity: 100,
        unitPrice: 10,
        expectedDate: "2026-10-01T00:00:00.000Z",
        organizationId: "org-a",
      },
    ]
  )
  checks++
  await openOrder()
  await fillOrder(validOrder)
  await submitOrder()
  assert.ok(
    await evaluate(
      `document.querySelector('[name="poNumber"]').validationMessage.includes('already exists')`
    )
  )
  checks++
  await fillOrder({
    poNumber: "PO-ZERO",
    vendorName: "",
    itemCode: "",
    quantity: "1",
    unitPrice: "0",
    expectedDate: "",
  })
  await submitOrder()
  await until(
    `!document.querySelector('dialog').open && document.querySelector('tbody')?.innerText.includes('PO-ZERO')`
  )
  checks++
  await mode("tenant-b")
  await send("Page.reload")
  await until(
    `document.querySelector('tbody')?.innerText.includes('Order org-b')`
  )
  assert.ok(
    !(await evaluate(`document.querySelector('main').innerText`)).includes(
      validOrder.poNumber
    )
  )
  checks++
  console.log(
    "PASS PO validation, error recovery, permission loss, create/refresh, optional fields, zero price and tenant isolation"
  )
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
