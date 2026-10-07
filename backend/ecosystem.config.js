// PM2 config: self-heals if the process' real memory usage runs away,
// instead of needing someone to SSH in and restart it manually.
module.exports = {
  apps: [
    {
      name: 'channel-partner-backend',
      script: 'server/index.js',
      cwd: __dirname,
      interpreter_args: '--max-old-space-size=1400',
      autorestart: true,
      max_memory_restart: '900M', // restart before OS-level OOM/thrash on a 2GB instance
      exp_backoff_restart_delay: 200,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
