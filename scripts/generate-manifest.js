import fs from 'fs'
import path from 'path'

const HIGHLIGHT_DIR = './content/highlight'
const PROJECTS_DIR = './content/projects'
const OUTPUT = './src/manifest.js'

function readProjects(dir, basePublicPath) {
  if (!fs.existsSync(dir)) return []
  const slugs = fs.readdirSync(dir).filter(f =>
    fs.statSync(path.join(dir, f)).isDirectory()
  )
  return slugs.map(slug => {
    const metaPath = path.join(dir, slug, 'meta.json')
    if (!fs.existsSync(metaPath)) return null
    const meta = JSON.parse(
      fs.readFileSync(metaPath, 'utf8')
    )
    // Resolve asset paths to public URLs
    meta.cover = `${basePublicPath}/${slug}/${meta.cover}`
    meta.assets = (meta.assets || []).map(a => ({
      ...a,
      src: `${basePublicPath}/${slug}/${a.src}`
    }))
    return meta
  }).filter(Boolean)
}

const highlight = readProjects(HIGHLIGHT_DIR, '/content/highlight')
const projects = readProjects(PROJECTS_DIR, '/content/projects')

const output = `// AUTO-GENERATED — DO NOT EDIT
export const highlightProjects = ${JSON.stringify(highlight, null, 2)};
export const allProjects = ${JSON.stringify(projects, null, 2)};
`

// Ensure src directory exists
if (!fs.existsSync('./src')) {
  fs.mkdirSync('./src', { recursive: true })
}

fs.writeFileSync(OUTPUT, output)
console.log(`Manifest written: ${highlight.length} highlight, ${projects.length} projects`)
