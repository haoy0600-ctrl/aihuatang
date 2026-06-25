const fs = require('fs')
const path = require('path')

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) {
    return
  }

  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.cpSync(source, target, { recursive: true })
}

const root = path.join(__dirname, '..')
const standaloneRoot = path.join(root, '.next', 'standalone')

copyRecursive(path.join(root, 'public'), path.join(standaloneRoot, 'public'))
copyRecursive(
  path.join(root, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static')
)

console.log('standalone assets synced')
