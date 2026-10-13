import { chromium, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = process.env.DEMO_OUTPUT ?? 'docs/demo/frames'
const manifest = JSON.parse(await fs.readFile('docs/demo/source-manifest.json', 'utf8'))
const sourceSHA = manifest.source_sha
for (const input of manifest.inputs) {
  const data = await fs.readFile(input.path)
  const actual = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
  if (actual !== input.git_blob_sha) throw new Error(`Recording source changed: ${input.path}. Regenerate and review provenance before capture.`)
}
console.log(`Verified ${manifest.inputs.length} pinned source inputs for ${sourceSHA}`)
if (process.env.DEMO_VERIFY_ONLY === '1') process.exit(0)
await fs.mkdir(root, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox','--disable-dev-shm-usage'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const errors=[]; page.on('pageerror',e=>errors.push(e.message))
const remote=[]; await context.route('**/*', route => {
  const url=route.request().url()
  if(!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('data:')) { remote.push(url); return route.abort() }
  return route.continue()
})
await page.goto('http://127.0.0.1:4173/explore')
await expect(page.getByRole('heading',{name:'ERC-8257 tool explorer'})).toBeVisible()
await page.addStyleTag({content:`body {padding-bottom:92px} #capture-label {position:fixed;bottom:0;left:0;right:0;height:82px;z-index:99999;background:#0c1522;color:#f2f6fb;display:flex;align-items:center;justify-content:space-between;padding:0 34px;border-top:1px solid #294258;box-shadow:0 -12px 30px #14203218;font:14px system-ui} #capture-label strong {font-size:21px;display:block;margin-bottom:5px;font-weight:650} #capture-label small {color:#a4b8ce;font-size:13px} #capture-label .tag {color:#75d9bd;border:1px solid #285f56;padding:8px 13px;border-radius:7px;letter-spacing:.06em;font-size:12px}`})
await page.evaluate((sha)=>{const el=document.createElement('div');el.id='capture-label';el.innerHTML='<div><strong id="chapter"></strong><small>Actual browser capture · source ' + sha.slice(0,12) + ' · no live transactions</small></div><span class="tag">FIXTURE PLAYGROUND</span>';document.body.append(el)}, sourceSHA)
const chapter=async(text)=>page.locator('#chapter').evaluate((el,s)=>el.textContent=s,text)
const pause=ms=>new Promise(r=>setTimeout(r,ms))
let active=true,index=0;const frames=[];const start=Date.now()
const sample=(async()=>{while(active){const name=`frame-${String(index++).padStart(5,'0')}.png`;await page.screenshot({path:root+'/'+name});frames.push({name,at:(Date.now()-start)/1000});await pause(120)}})()
try {
 await chapter('01 / Explore tools and their access requirements');await pause(2600)
 await page.getByLabel('Search tools').pressSequentially('abi',{delay:150});await expect(page.getByText('Contract ABI Fetcher').first()).toBeVisible();await pause(1800)
 await page.getByLabel('Search tools').fill('');await pause(600)
 await page.getByRole('link',{name:'Debug',exact:true}).click();await chapter('02 / Explain a denied wallet — then simulate access');await expect(page.getByTestId('access-verdict')).toContainText('Access false');await pause(2600)
 await page.getByRole('button',{name:/Passing wallet/}).click();await expect(page.getByTestId('access-verdict')).toContainText('Access true');await pause(1800)
 await page.getByRole('button',{name:/Invoke through gateway/}).click();await expect(page.getByText('"status": "success"')).toBeVisible();await page.getByText('"status": "success"').scrollIntoViewIfNeeded();await chapter('03 / Inspect the simulated gateway response');await pause(2600)
 await page.getByRole('link',{name:'Register',exact:true}).click();await chapter('04 / Validate a manifest and stage its payload');await pause(1700)
 await page.getByLabel('Invocation endpoint').fill('http://localhost:8787/invoke');await expect(page.getByText('Invocation URL must use HTTPS.')).toBeVisible();await pause(1800)
 await page.getByLabel('Invocation endpoint').fill('https://api.example.com/8257/invoice-settlement');await page.getByRole('button',{name:'Stage registration'}).click();await expect(page.getByRole('status')).toContainText('Registration payload is ready for Base.');await pause(2400)
 await page.getByRole('link',{name:'Docs',exact:true}).click();await chapter('05 / Browse SDK examples — implementation guidance');await pause(2300)
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();await chapter('06 / Read sample analytics — fixture metrics only');await pause(3100)
 await page.screenshot({path:root+'/poster.png'})
} finally {active=false;await sample;await fs.writeFile(root+'/frames.json',JSON.stringify({frames,errors,blockedRemoteRequests:remote,sourceSHA},null,2));await browser.close()}
if(errors.length||remote.length) throw new Error(JSON.stringify({errors,remote}))
console.log(`Captured ${frames.length} frames, no page errors or remote provider requests`)
