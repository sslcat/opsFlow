import assert from "node:assert/strict"

// Exercise the actual upload component. Only transport and Clerk identity are
// fixtures; deliberately deliver callbacks even after cancellation.
export async function checkUploadIdentity({
  evaluate,
  until,
  send,
  screenshot,
  origin,
}) {
  let checks = 0
  await send("Network.setCookie", {
    name: "workspace-test",
    value: "authorized",
    url: origin,
    path: "/",
  })
  await send("Page.navigate", { url: origin + "/upload" })
  await until(`document.querySelector('input[type=file]') !== null`)
  await evaluate(`(() => {
    const fixture = window.uploadFixture = { uploads: [], requests: [] };
    window.XMLHttpRequest = class {
      upload = {};
      open() {}
      send(body) {
        this.fileName = body.get('file').name;
        this.lateProgress = this.upload.onprogress;
        this.lateLoad = this.onload;
        fixture.uploads.push(this);
      }
      abort() { this.aborted = true; this.onabort?.(); this.onloadend?.(); }
    };
    const originalFetch = window.fetch;
    window.fetch = (url, options) => {
      if (url !== '/api/process-invoice') return originalFetch(url, options);
      return new Promise((resolve, reject) => {
        fixture.requests.push({ body: JSON.parse(options.body), signal: options.signal, resolve, reject });
      });
    };
    fixture.result = marker => ({
      invoice: { invoiceNumber: marker, poNumber: marker + '-PO', vendorName: marker + '-vendor', quantity: 10, unitPrice: 125 },
      extraction: { invoice: { confidence: 0.95, warnings: [marker + '-extraction-warning'] }, attempts: [{ status: 'SUCCEEDED', provider: 'openai' }] },
      insights: { status: 'AVAILABLE', insights: { summary: marker + '-AI-summary', observations: [marker + '-observation'], recommendations: [marker + '-recommendation'], confidence: 0.9 } }
    });
  })()`)
  const changeIdentity = async (mode) => {
    await evaluate(
      `document.cookie = 'workspace-test=${mode}; path=/; SameSite=Lax'; window.dispatchEvent(new Event('workspace-auth-change'))`
    )
  }
  const select = async (name = "OLD-private.pdf") => {
    await evaluate(`(() => {
      const files = new DataTransfer();
      files.items.add(new File(['%PDF-1.4 synthetic'], ${JSON.stringify(name)}, {type: 'application/pdf'}));
      const input = document.querySelector('input[type=file]');
      input.files = files.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    })()`)
    await until(
      `Array.from(document.querySelectorAll('main button')).some(b => b.textContent.includes('Upload & process') && !b.disabled)`
    )
  }
  const startUpload = async (name) => {
    const index = await evaluate("window.uploadFixture.uploads.length")
    await select(name)
    await evaluate(
      `Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Upload & process')).click()`
    )
    await until(`window.uploadFixture.uploads.length === ${index + 1}`)
    return index
  }
  const finishUpload = (index, id = "OLD-document") =>
    evaluate(`(() => {
    const request = window.uploadFixture.uploads[${index}];
    request.status = 200; request.response = {document: {id: ${JSON.stringify(id)}}};
    request.lateProgress({lengthComputable: true, loaded: 99, total: 100});
    request.lateLoad(); request.onloadend?.();
  })()`)
  const startProcessing = async (name, id) => {
    const requestIndex = await evaluate("window.uploadFixture.requests.length")
    const uploadIndex = await startUpload(name)
    await finishUpload(uploadIndex, id)
    await until(`window.uploadFixture.requests.length === ${requestIndex + 1}`)
    return requestIndex
  }
  const complete = (index, marker = "OLD-INVOICE") =>
    evaluate(
      `window.uploadFixture.requests[${index}].resolve(Response.json(window.uploadFixture.result(${JSON.stringify(marker)})))`
    )
  const fresh = async () => {
    await until(
      `document.querySelector('input[type=file]')?.files.length === 0 && Array.from(document.querySelectorAll('main button')).some(b => b.textContent.includes('Upload & process') && b.disabled)`
    )
    assert.equal(
      await evaluate(
        `document.querySelector('main').innerText.includes('OLD')`
      ),
      false
    )
    assert.equal(
      await evaluate(
        `document.querySelector('main [role=alert], main progress, #insights-heading') !== null`
      ),
      false
    )
    assert.equal(
      await evaluate(
        `document.querySelector('main').innerText.includes('Retry processing')`
      ),
      false
    )
    assert.equal(
      await evaluate(
        `document.querySelector('main').innerText.includes('Invoice processed successfully')`
      ),
      false
    )
    checks++
  }

  // Completed results must disappear without navigation or a server refresh.
  const completed = await startProcessing()
  await complete(completed)
  await until(
    `document.querySelector('main').innerText.includes('OLD-INVOICE-AI-summary')`
  )
  await changeIdentity("authorized")
  assert.ok(
    await evaluate(
      `document.querySelector('main').innerText.includes('OLD-INVOICE')`
    ),
    "Same identity must preserve the result"
  )
  await changeIdentity("tenant-b")
  await fresh()
  await changeIdentity("authorized")
  await fresh()
  await screenshot("upload-identity-cleared")

  // User changes in the same organization must reset just like organization changes.
  const priorUser = await startProcessing()
  await complete(priorUser)
  await until(
    `document.querySelector('main').innerText.includes('OLD-INVOICE')`
  )
  await changeIdentity("user-b")
  await fresh()

  // Upload abort + late load/progress must not start processing the old document.
  const uploading = await startUpload()
  const beforeRequests = await evaluate("window.uploadFixture.requests.length")
  await changeIdentity("tenant-b")
  await fresh()
  assert.ok(
    await evaluate(`window.uploadFixture.uploads[${uploading}].aborted`)
  )
  await finishUpload(uploading)
  assert.equal(
    await evaluate("window.uploadFixture.requests.length"),
    beforeRequests
  )
  await fresh()

  // A previous processing response must not replace or unlock a new request.
  const previous = await startProcessing()
  await changeIdentity("authorized")
  await fresh()
  assert.ok(
    await evaluate(`window.uploadFixture.requests[${previous}].signal.aborted`)
  )
  const current = await startProcessing("current.pdf", "current-document")
  await complete(previous)
  assert.ok(
    await evaluate(
      `Array.from(document.querySelectorAll('main button')).some(b => b.textContent.includes('Processing') && b.disabled)`
    )
  )
  assert.equal(
    await evaluate(
      `document.querySelector('main').innerText.includes('OLD-INVOICE')`
    ),
    false
  )
  await complete(current, "CURRENT-INVOICE")
  await until(
    `document.querySelector('main').innerText.includes('CURRENT-INVOICE')`
  )
  checks++
  await changeIdentity("tenant-b")
  await fresh()

  // Headers can arrive before a switch and the JSON body after it.
  const reading = await startProcessing()
  await evaluate(`(() => {
    const request = window.uploadFixture.requests[${reading}];
    request.resolve({ok: true, json: () => new Promise(resolve => { request.resolveBody = resolve })});
  })()`)
  await until(
    `typeof window.uploadFixture.requests[${reading}].resolveBody === 'function'`
  )
  await changeIdentity("authorized")
  await fresh()
  await evaluate(
    `window.uploadFixture.requests[${reading}].resolveBody(window.uploadFixture.result('OLD-INVOICE'))`
  )
  await fresh()

  // Same-identity retry still reuses its document. Switches discard that reference.
  const failed = await startProcessing()
  await evaluate(
    `window.uploadFixture.requests[${failed}].resolve(Response.json({error: 'OLD-processing-error'}, {status: 400}))`
  )
  await until(
    `document.querySelector('main [role=alert]')?.textContent.includes('OLD-processing-error')`
  )
  const uploadsBeforeRetry = await evaluate(
    "window.uploadFixture.uploads.length"
  )
  const retryIndex = await evaluate("window.uploadFixture.requests.length")
  await evaluate(
    `Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Retry processing')).click()`
  )
  await until(`window.uploadFixture.requests.length === ${retryIndex + 1}`)
  assert.equal(
    await evaluate("window.uploadFixture.uploads.length"),
    uploadsBeforeRetry
  )
  assert.deepEqual(
    await evaluate(`window.uploadFixture.requests[${retryIndex}].body`),
    { documentId: "OLD-document" }
  )
  await changeIdentity("tenant-b")
  await fresh()
  assert.ok(
    await evaluate(
      `window.uploadFixture.requests[${retryIndex}].signal.aborted`
    )
  )
  await evaluate(
    `window.uploadFixture.requests[${retryIndex}].reject(new Error('OLD-late-error'))`
  )
  await fresh()
  const newRequest = await startProcessing(
    "new-tenant.pdf",
    "new-tenant-document"
  )
  assert.deepEqual(
    await evaluate(`window.uploadFixture.requests[${newRequest}].body`),
    { documentId: "new-tenant-document" }
  )
  await evaluate(
    `window.uploadFixture.requests[${newRequest}].resolve(Response.json({error: 'OLD-retry-state'}, {status: 400}))`
  )
  await until(`document.querySelector('main [role=alert]') !== null`)
  await changeIdentity("authorized")
  await fresh()

  // Losing identity, organization, or loaded auth state hides and destroys the draft.
  for (const mode of ["missing", "anonymous", "loading"]) {
    await select()
    await changeIdentity(mode)
    await until(`document.querySelector('input[type=file]') === null`)
    assert.equal(
      await evaluate(
        `document.querySelector('main').innerText.includes('OLD')`
      ),
      false
    )
    await changeIdentity("authorized")
    await fresh()
  }
  console.log(
    `PASS ${checks} upload identity checks: results, user/org changes, pending transport, retry, late response/body/error and auth loss`
  )
  return checks
}
