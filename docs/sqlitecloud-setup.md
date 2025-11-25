# SQLiteCloud Setup Guide

This guide will help you set up SQLiteCloud as your persistent database for the Fastify Auth service.

## Prerequisites

- A SQLiteCloud account
- SQLiteCloud database instance created
- Connection credentials (username, password, host, port, database name)

## Step 1: Create SQLiteCloud Account

1. Go to [https://sqlitecloud.io](https://sqlitecloud.io)
2. Sign up for an account
3. Verify your email address
4. Log in to your SQLiteCloud dashboard

## Step 2: Create Database Instance

1. In SQLiteCloud dashboard, go to **Databases**
2. Click **Create Database**
3. Configure your database:
   - **Database Name**: Choose a name (e.g., `fastify-auth-db`)
   - **Region**: Select your preferred region
   - **Plan**: Choose a plan (Free tier available)
4. Note your connection details:
   - **Host**: Your database host (e.g., `your-instance.sqlitecloud.io`)
   - **Port**: Usually `443` for HTTPS or `80` for HTTP
   - **Database Name**: The name you chose
   - **Username**: Your SQLiteCloud username
   - **Password**: Your database password

## Step 3: Get Connection String

SQLiteCloud connection string format:
```
sqlitecloud://username:password@host:port/database
```

Example:
```
sqlitecloud://myuser:mypassword@myinstance.sqlitecloud.io:443/fastify-auth-db
```

## Step 4: Configure Application

### Option 1: Environment Variables

Set the following environment variables:

```bash
export DB_TYPE="sqlitecloud"
export DATABASE_URL="sqlitecloud://username:password@host:port/database"
# Or use DB_CONNECTION_STRING
export DB_CONNECTION_STRING="sqlitecloud://username:password@host:port/database"
```

### Option 2: Kubernetes Secret

Update `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: fastify-auth-secrets
type: Opaque
stringData:
  DATABASE_URL: "sqlitecloud://username:password@host:port/database"
```

Then apply:
```bash
kubectl apply -f k8s/secret.yaml
```

## Step 5: Run Database Migrations

### Local Development

```bash
# Set environment variables
export DB_TYPE="sqlitecloud"
export DATABASE_URL="sqlitecloud://username:password@host:port/database"

# Run migrations
pnpm prisma migrate deploy
# Or
pnpm prisma db push
```

### Kubernetes

1. Create a Job to run migrations:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fastify-auth-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: fastify-auth-service:latest
        command: ["sh", "-c", "pnpm prisma migrate deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fastify-auth-secrets
              key: DATABASE_URL
      restartPolicy: Never
  backoffLimit: 3
```

2. Run the migration job:
```bash
kubectl apply -f migration-job.yaml
kubectl wait --for=condition=complete --timeout=300s job/fastify-auth-migrate
```

## Step 6: Verify Connection

### Test Connection Locally

```bash
# Set environment variables
export DB_TYPE="sqlitecloud"
export DATABASE_URL="sqlitecloud://username:password@host:port/database"

# Test with Prisma Studio
pnpm prisma studio
```

### Test Connection in Kubernetes

```bash
# Check pod logs
kubectl logs -l app=fastify-auth-service

# Look for database connection messages
# Should see: "Prisma plugin registered" and no connection errors
```

## Step 7: Update Prisma Schema (if needed)

The Prisma schema should work with SQLiteCloud as-is since it uses the SQLite provider. However, if you need to customize:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

The connection string format is handled by the SQLiteCloud driver.

## Troubleshooting

### Connection Errors

1. **Check connection string format**: Ensure it follows `sqlitecloud://user:pass@host:port/db` format
2. **Verify credentials**: Check username and password are correct
3. **Check network**: Ensure your application can reach SQLiteCloud endpoints
4. **Check firewall**: SQLiteCloud may require IP whitelisting

### Migration Issues

1. **Schema conflicts**: Ensure your local schema matches production
2. **Connection timeout**: Increase timeout in Prisma configuration
3. **Permission errors**: Verify database user has CREATE/ALTER permissions

### Performance Issues

1. **Connection pooling**: SQLiteCloud handles connection pooling automatically
2. **Query optimization**: Use indexes as defined in your Prisma schema
3. **Monitor usage**: Check SQLiteCloud dashboard for usage metrics

## Security Best Practices

1. **Use secrets**: Never commit connection strings to version control
2. **Rotate credentials**: Regularly rotate database passwords
3. **IP whitelisting**: Restrict database access to known IPs
4. **SSL/TLS**: Use HTTPS connection (port 443) when possible
5. **Least privilege**: Grant only necessary permissions to database user

## Backup and Recovery

SQLiteCloud provides automatic backups. To create manual backups:

1. Use SQLiteCloud dashboard to export database
2. Or use Prisma to export data:
```bash
pnpm prisma db execute --stdin < backup.sql
```

## Cost Optimization

- **Free Tier**: Check SQLiteCloud free tier limits
- **Connection limits**: Monitor active connections
- **Storage**: Monitor database size
- **Query optimization**: Optimize queries to reduce costs

## Additional Resources

- [SQLiteCloud Documentation](https://docs.sqlitecloud.io)
- [Prisma SQLite Documentation](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
- [SQLiteCloud Pricing](https://sqlitecloud.io/pricing)

