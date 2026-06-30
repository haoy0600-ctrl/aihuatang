const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { loadEnvConfig } = require('@next/env')

const appRoot = __dirname
const standaloneServer = path.join(appRoot, '.next', 'standalone', 'server.js')

loadEnvConfig(appRoot)

process.env.NODE_ENV = 'production'
process.env.PORT = process.env.PORT || process.env.BT_PORT || '3001'
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

function ensureBuild() {
  if (fs.existsSync(standaloneServer)) {
    return
  }

  console.log('Missing .next/standalone/server.js, running npm run build...')
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCmd, ['run', 'build'], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0 || !fs.existsSync(standaloneServer)) {
    console.error('Build failed or .next/standalone/server.js was not generated.')
    process.exit(result.status || 1)
  }
}

ensureBuild()
require(standaloneServer)
