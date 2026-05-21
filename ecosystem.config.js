module.exports = {
  apps: [
    {
      name: "ramein-be",
      cwd: __dirname,
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
