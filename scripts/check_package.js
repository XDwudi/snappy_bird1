// Audit actual upload candidates using local packOptions; no network or SDK needed.
const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'game.json'), 'utf8'))
const ignore = config.packOptions.ignore
const packages = [{ name: 'main', root: null, files: [], bytes: 0 }].concat(
  (manifest.subpackages || []).map(p => ({ name: p.name, root: p.root.replace(/\/$/, ''), files: [], bytes: 0 }))
)
function walk(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = path.posix.join(dir, item.name)
    if (item.name === '.DS_Store' || ['project.config.json', 'project.private.config.json'].includes(file)) continue
    if (ignore.some(r => r.type === 'folder' ? file === r.value || file.startsWith(r.value + '/') : r.type === 'file' && file === r.value)) continue
    if (item.isDirectory()) walk(file)
    else {
      const p = packages.find(p => p.root && file.startsWith(p.root + '/')) || packages[0]
      p.files.push(file)
      p.bytes += fs.statSync(path.join(root, file)).size
    }
  }
}
walk('')
for (const p of packages) {
  console.log(p.name + ': ' + p.bytes + ' bytes / ' + (p.bytes / 1024).toFixed(1) + ' KiB, ' + p.files.length + ' files')
  // Use a conservative 4,000,000-byte per-package guard, including assets.
  if (p.bytes >= 4000000) throw new Error(p.name + ' exceeds project upload guard')
  if (p.files.some(f => /^(docs|test|scripts)\//.test(f))) throw new Error('Development files leaked into upload package')
}
const result = { note: 'Uncompressed local upload candidates; WeChat final compiled size may differ', totalBytes: packages.reduce((n,p) => n+p.bytes,0), packages }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n')
module.exports = result
