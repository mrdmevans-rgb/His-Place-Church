import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Facebook and text messages build link previews from the page's HTML before any
// JavaScript runs, so every page would show the home page preview. This writes a
// copy of index.html for a few pages people share, with their own title, description,
// and picture. The site works exactly the same; only the preview changes.
const SITE = 'https://www.hpcchurch.church'
const PREVIEWS = {
  hope: {
    title: 'Seven Days of Hope | His Place Community Church',
    description: 'Seven short emails, one each morning, walking through the Gospel of John. Free, five minutes a day, stop anytime. No church background needed.',
    image: 'share-hope.jpg',
    alt: 'Seven Days of Hope. Searching for hope? Seven short emails through the Gospel of John.',
  },
  questions: {
    title: 'Honest Questions | His Place Community Church',
    description: 'Plain, honest answers from the Bible to the questions people lie awake with: Does God see my pain? Can God forgive me? What if I have doubts?',
    image: 'share-questions.jpg',
    alt: 'Honest Questions. Questions people lie awake with.',
  },
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function pagePreviews() {
  let outDir = 'dist'
  return {
    name: 'page-previews',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const [path, p] of Object.entries(PREVIEWS)) {
        const url = `${SITE}/${path}`, img = `${SITE}/${p.image}`
        const swap = (re, value) => { if (!re.test(out)) throw new Error(`page preview for /${path}: ${re} not found in index.html`); out = out.replace(re, value) }
        let out = html
        swap(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`)
        swap(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(p.description)}"`)
        swap(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
        swap(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(p.title)}"`)
        swap(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(p.description)}"`)
        swap(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
        swap(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${img}"`)
        swap(/<meta property="og:image:alt" content="[^"]*"/, `<meta property="og:image:alt" content="${esc(p.alt)}"`)
        swap(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(p.title)}"`)
        swap(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(p.description)}"`)
        swap(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${img}"`)
        mkdirSync(join(outDir, path), { recursive: true })
        writeFileSync(join(outDir, path, 'index.html'), out)
      }
    },
  }
}

// imagetools makes small, medium, and large WebP copies of photos at build time,
// so phones download a small photo and big screens a sharper one.
export default defineConfig({
  plugins: [react(), imagetools(), pagePreviews()],
})
