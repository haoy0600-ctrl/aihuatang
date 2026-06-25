const fs = require('fs')
const path = require('path')

const standaloneRoot = path.join(__dirname, '.next', 'standalone')
const standaloneServer = path.join(standaloneRoot, 'server.js')

const port = process.env.PORT || process.env.BT_PORT || '3001'
const hostname = process.env.HOSTNAME || '0.0.0.0'

process.env.NODE_ENV = 'production'
process.env.PORT = port
process.env.HOSTNAME = hostname

if (!fs.existsSync(standaloneServer)) {
  console.error('Missing .next/standalone/server.js. Run npm run build first.')
  process.exit(1)
}

require(standaloneServer)
