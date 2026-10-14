import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { zipSync, unzipSync } from 'fflate'
import assert from 'node:assert/strict'

const root = resolve('extension-dist')
const files = {}
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) await collect(path)
    else files[relative(root, path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path))
  }
}
await collect(root)
const archive = zipSync(files, { level: 9 })
const unpacked = unzipSync(archive)
assert.deepEqual(Object.keys(unpacked).sort(), Object.keys(files).sort())
for (const name of Object.keys(files)) assert.deepEqual(unpacked[name], files[name])
assert.equal(JSON.parse(new TextDecoder().decode(unpacked['manifest.json'])).manifest_version, 3)
await writeFile('site/public/imagegrab-extension.zip', archive)
console.log(`Extension ZIP verified: ${Object.keys(files).length} files, ${archive.length} bytes`)
