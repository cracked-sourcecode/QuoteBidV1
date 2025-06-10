module.exports = {
  apps: [
    {
      name: 'quotebid-api',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5050
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      max_memory_restart: '1G',
      restart_delay: 3000
    },
    {
      name: 'quotebid-websocket', 
      script: './apps/wsServer.ts',
      interpreter: 'npx tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 4000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/ws-error.log',
      out_file: './logs/ws-out.log', 
      log_file: './logs/ws-combined.log',
      max_memory_restart: '500M',
      restart_delay: 3000
    },
    {
      name: 'updatePrices',
      script: './apps/worker/pricingWorker.ts',
      interpreter: 'npx tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        ENGINE_VERSION: process.env.ENGINE_VERSION || 'legacy',
        WORKER_IMAGE: process.env.WORKER_IMAGE || 'default'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      max_memory_restart: '800M',
      restart_delay: 5000,
      // Worker-specific restart policy
      max_restarts: 10,
      min_uptime: '30s'
    }
  ]
}; 