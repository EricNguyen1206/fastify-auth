# Project Authentication with Fastify

This project is a Fastify-based authentication system that includes user registration, login, and protected routes. It uses **PostgreSQL** (Aiven Cloud) as the database and bcrypt for password hashing. The logging is configured with pino-pretty for development and pino-loki for production environments.

## Features

- User Registration
- User Login with JWT
- Protected Routes
- PostgreSQL Database Integration (Aiven Cloud)
- Environment-based Logging Configuration

## Prerequisites

- Node.js (version 18.15.0 or higher)
- pnpm (Package Manager)
- Docker or Podman (for production deployment)
