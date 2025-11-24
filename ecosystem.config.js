module.exports = {
  apps: [
    {
      name: "fastify-auth",
      script: "./src/server.js", // Đã trỏ đến server.js
      instances: 4, // 4 clusters for performance testing
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 8000, // Port for K6 performance tests
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8000, // Port for K6 performance tests
      },
    },
  ],
};
