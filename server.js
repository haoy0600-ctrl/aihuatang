const fs = require('fs')
const path = require('path')
const { fork, spawnSync } = require('child_process')
const { loadEnvConfig } = require('@next/env')

const appRoot = __dirname
const standaloneRoot = path.join(appRoot, '.next', 'standalone')
const standaloneServer = path.join(standaloneRoot, 'server.js')
const deployedRevFile = path.join(appRoot, '.deployed-rev')

loadEnvConfig(appRoot)

const port = process.env.PORT || process.env.BT_PORT || '3001'
const hostname = process.env.HOSTNAME || '0.0.0.0'

process.env.NODE_ENV = 'production'
process.env.PORT = port
process.env.HOSTNAME = hostname

if (!fs.existsSync(standaloneServer)) {
  console.log('Missing .next/standalone/server.js, building project first...')
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const buildResult = spawnSync(npmCmd, ['run', 'build'], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (buildResult.status !== 0 || !fs.existsSync(standaloneServer)) {
    console.error('Missing .next/standalone/server.js. Run npm run build first.')
    process.exit(1)
  }
}

if (process.env.AIHUATANG_CHILD === '1') {
  require(standaloneServer)
  return
}

let child = null
let restarting = false
let lastRevision = readRevision()

function readRevision() {
  try {
    if (fs.existsSync(deployedRevFile)) {
      return fs.readFileSync(deployedRevFile, 'utf8').trim()
    }
  } catch (error) {
    console.error('Failed to read deployed revision:', error)
  }
  return ''
}

function startChild() {
  if (child) return

  child = fork(standaloneServer, [], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      AIHUATANG_CHILD: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: hostname,
    },
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    child = null

    if (signal === 'SIGTERM' && restarting) {
      restarting = false
      setTimeout(() => startChild(), 1000)
      return
    }

    console.error(`Standalone server exited with code=${code ?? 'null'} signal=${signal ?? 'null'}. Restarting...`)
    setTimeout(() => startChild(), 2000)
  })
}

function restartChild(reason) {
  if (!child) {
    startChild()
    return
  }

  if (restarting) return

  restarting = true
  console.log(`Detected ${reason}, restarting standalone server...`)

  try {
    child.kill('SIGTERM')
  } catch (error) {
    console.error('Failed to stop child process:', error)
    restarting = false
    startChild()
    return
  }

  setTimeout(() => {
    if (child) {
      try {
        child.kill('SIGKILL')
      } catch (error) {
        console.error('Failed to force stop child process:', error)
      }
    }
  }, 10000).unref()
}

fs.watchFile(deployedRevFile, { interval: 2000 }, () => {
  const nextRevision = readRevision()
  if (!nextRevision || nextRevision === lastRevision) {
    return
  }

  lastRevision = nextRevision
  restartChild(`deployed revision ${nextRevision}`)
})

process.on('SIGINT', () => {
  if (child) child.kill('SIGTERM')
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM')
  process.exit(0)
})

startChild()
