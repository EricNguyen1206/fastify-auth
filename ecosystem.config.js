module.exports = {
  apps : [{
    name: "fastify-auth",
    script: "./src/server.js",   // Đã trỏ đến server.js
    instances: "max", 
    exec_mode: "cluster", 
    watch: false,
    env: {
      NODE_ENV: "development",
      PORT: 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};