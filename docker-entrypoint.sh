#!/bin/sh
# Entrypoint script for Docker container

# Generate Prisma client if not exists
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "Generating Prisma client..."
  npx prisma generate
fi

# Run database migrations
echo "Running database migrations..."
npx prisma db push --accept-data-loss || true

# Start the application
echo "Starting application..."
exec node src/server.js
