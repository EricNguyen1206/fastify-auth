# Project Authentication with Fastify

This project is a Fastify-based authentication system that includes user registration, login, and protected routes. It uses SQLite as the database and bcrypt for password hashing. The logging is configured with pino-pretty for development and pino-loki for production environments.

## Features
- User Registration
- User Login with JWT
- Protected Routes
- SQLite Database Integration
- Environment-based Logging Configuration

## Prerequisites
- Node.js (version 18.15.0 or higher)
- npm (Node Package Manager)
- SQLite3
- Loki (for production logging)

## How to Run

- Command to start the server in development mode with nodemon:
  ```bash
  npm run dev
  ```

- Command to start the server in production mode:
  ```bash
  npm start
  ```
- Command to start the server in production mode with PM2:
  ```bash
  pm2 start app.js
  ```

## Scale plan

1. PM2 Mode - Vertical Scaling

- Using Fat Container with multiple vCPU and large memory
- Config PM2 to use cluster mode
- Run only 1 Docker instance in PM2 with 4 processes
- No need to config Load Balancer, because PM2 will handle the load balancing between processes

2. K8s - Horizontal Scaling

- Using Light Container with single vCPU and small memory
- Config K8s to use horizontal pod auto-scaling
- Run multiple Docker instances in K8s with 4 processes each
- Need to config Load Balancer to distribute traffic between Docker instances

## Observablity architecture

- Loki for logging
- Grafana for visualization
- Prometheus for metrics
- Tempo for tracing

## Testing

- Jest for unit testing
- Supertest for integration testing
- K6 for load testing
