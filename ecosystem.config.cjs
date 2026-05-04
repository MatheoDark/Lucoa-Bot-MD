module.exports = {
  apps: [{
    name: 'Lucoa',
    script: 'index.js',
    node_args: '--no-deprecation',
    kill_timeout: 15000,
    wait_ready: false,
    listen_timeout: 10000,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: 30000,
    exp_backoff_restart_delay: 3000
  }]
}
