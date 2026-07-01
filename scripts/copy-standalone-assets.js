const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function getGitRevision(root) {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

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
const revision = getGitRevision(root)
const buildInfo = {
  revision,
  builtAt: new Date().toISOString(),
}

fs.mkdirSync(path.join(root, 'public'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'public', 'build-info.json'),
  `${JSON.stringify(buildInfo)}\n`,
  'utf8',
)
fs.writeFileSync(path.join(root, '.deployed-rev'), `${revision}\n`, 'utf8')

copyRecursive(path.join(root, 'public'), path.join(standaloneRoot, 'public'))
copyRecursive(
  path.join(root, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static')
)

if (fs.existsSync(standaloneRoot)) {
  fs.writeFileSync(path.join(standaloneRoot, '.deployed-rev'), `${revision}\n`, 'utf8')
}

console.log(`standalone assets synced for ${revision}`)
