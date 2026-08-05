import { readdir, stat, unlink } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// The hero PNGs were the only images in public/ that never went through a
// conversion pass: five files of 1.5-1.9 MB each, sitting above the fold on the
// landing page and on every login and recovery screen. Everything else under
// public/images was already WebP at 85-235 KB.
const __dirname = dirname(fileURLToPath(import.meta.url))
const heroDir = join(__dirname, '..', 'public', 'images', 'hero')

// Wide enough for a full-bleed background on a desktop display; the source
// files were larger than any layout ever asks for.
const MAX_WIDTH = 1600
const QUALITY = 80

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`

const files = (await readdir(heroDir)).filter(
  (name) => extname(name).toLowerCase() === '.png',
)

if (files.length === 0) {
  console.log('No PNGs left in public/images/hero — nothing to convert.')
  process.exit(0)
}

let before = 0
let after = 0

for (const name of files) {
  const source = join(heroDir, name)
  const target = source.replace(/\.png$/i, '.webp')

  const { size: sourceSize } = await stat(source)
  await sharp(source)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(target)
  const { size: targetSize } = await stat(target)

  before += sourceSize
  after += targetSize
  console.log(`${name}: ${kb(sourceSize)} -> ${kb(targetSize)}`)

  await unlink(source)
}

console.log(`\nTotal: ${kb(before)} -> ${kb(after)}`)
