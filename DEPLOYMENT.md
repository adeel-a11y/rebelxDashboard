# RebelX V3 Deployment Guide

This guide covers deployment strategies for the RebelX V3 application across various platforms and environments.

## 📋 Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Variables](#environment-variables)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Stripe Configuration](#stripe-configuration)
- [Deployment Options](#deployment-options)
  - [Heroku Deployment](#heroku-deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [AWS Deployment](#aws-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Traditional VPS](#traditional-vps)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Logging](#monitoring--logging)
- [CI/CD Pipeline](#cicd-pipeline)
- [Backup & Recovery](#backup--recovery)

---

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All environment variables are configured
- [ ] MongoDB connection string is production-ready
- [ ] Stripe keys are set to production keys
- [ ] JWT secret is strong and unique
- [ ] CORS settings are properly configured
- [ ] SSL/TLS certificates are installed
- [ ] Rate limiting is enabled
- [ ] Error logging is configured
- [ ] Backup strategy is in place
- [ ] Security headers are configured
- [ ] Dependencies are up to date
- [ ] Tests are passing
- [ ] Build process completes without errors

---

## 🔐 Environment Variables

### Production Environment Variables

Create a `.env.production` file with these variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rebelx-v3-prod?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-production-jwt-secret-min-32-chars
JWT_EXPIRE=7d

# Stripe Configuration (Production Keys)
STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Email Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key

# CORS Configuration
CLIENT_URL=https://app.rebelx.com

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=error

# Redis (for sessions/caching)
REDIS_URL=redis://username:password@redis-server:6379
```

---

## 🗄️ MongoDB Atlas Setup

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project

### 2. Create a Cluster
1. Click "Build a Cluster"
2. Choose your cloud provider (AWS recommended)
3. Select region closest to your users
4. Choose cluster tier (M10 minimum for production)
5. Name your cluster

### 3. Configure Security
1. **Database Access:**
   - Add a database user
   - Use a strong password
   - Grant appropriate permissions (readWrite on database)

2. **Network Access:**
   - Add IP whitelist
   - For production, use specific IPs
   - For development, can use 0.0.0.0/0 (not recommended for production)

### 4. Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `rebelx-v3-prod`

### 5. Configure Indexes
Connect to your database and run:
```javascript
// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "department": 1 })
db.users.createIndex({ "status": 1 })

// Clients collection indexes
db.clients.createIndex({ "name": 1 })
db.clients.createIndex({ "email": 1 })
db.clients.createIndex({ "contactStatus": 1 })
db.clients.createIndex({ "ownedBy": 1 })
db.clients.createIndex({ "industry": 1 })
db.clients.createIndex({ "city": 1, "state": 1 })

// Activities collection indexes
db.activities.createIndex({ "clientId": 1, "createdAt": -1 })
db.activities.createIndex({ "userId": 1, "createdAt": -1 })
db.activities.createIndex({ "type": 1 })
```

---

## 💳 Stripe Configuration

### 1. Production Setup
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to live mode
3. Get your production API keys
4. Configure webhook endpoints

### 2. Webhook Configuration
1. Go to Developers → Webhooks
2. Add endpoint: `https://api.rebelx.com/api/webhooks/stripe`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `customer.created`
   - `customer.updated`
4. Copy the webhook signing secret

### 3. Security Settings
1. Enable 3D Secure for payments
2. Configure fraud detection rules
3. Set up payment method restrictions
4. Enable PCI compliance mode

---

## 🚀 Deployment Options

## Heroku Deployment

### Backend Deployment

1. **Install Heroku CLI:**
```bash
brew tap heroku/brew && brew install heroku
```

2. **Create Heroku App:**
```bash
cd server
heroku create rebelx-v3-api
```

3. **Set Environment Variables:**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set STRIPE_SECRET_KEY="your-stripe-key"
# Set all other environment variables
```

4. **Deploy:**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

5. **Scale Dynos:**
```bash
heroku ps:scale web=1
```

### Frontend Deployment

1. **Create Static Site:**
```bash
cd client
heroku create rebelx-v3-app --buildpack mars/create-react-app
```

2. **Configure API URL:**
```bash
heroku config:set VITE_API_URL=https://rebelx-v3-api.herokuapp.com/api
```

3. **Deploy:**
```bash
git push heroku main
```

---

## Vercel Deployment (Frontend)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Build and Deploy:**
```bash
cd client
npm run build
vercel --prod
```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard
   - Project Settings → Environment Variables
   - Add all VITE_* variables

4. **Custom Domain:**
   - Add domain in Vercel Dashboard
   - Update DNS records

---

## AWS Deployment

### Using Elastic Beanstalk

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize EB:**
```bash
cd server
eb init -p node.js-14 rebelx-v3-api
```

3. **Create Environment:**
```bash
eb create production
```

4. **Set Environment Variables:**
```bash
eb setenv NODE_ENV=production MONGODB_URI=your-uri JWT_SECRET=your-secret
```

5. **Deploy:**
```bash
eb deploy
```

### Using EC2

1. **Launch EC2 Instance:**
   - Choose Ubuntu 20.04 LTS
   - Select t3.medium or larger
   - Configure security groups (ports 80, 443, 22)

2. **Connect and Setup:**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Clone repository
git clone https://github.com/yourusername/rebelx-v3.git
cd rebelx-v3
```

3. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name api.rebelx.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Start Application:**
```bash
cd server
npm install
pm2 start index.js --name rebelx-api
pm2 save
pm2 startup
```

---

## Docker Deployment

### 1. Create Dockerfiles

**Backend Dockerfile (server/Dockerfile):**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
```

**Frontend Dockerfile (client/Dockerfile):**
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose Configuration

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - redis
    restart: unless-stopped

  client:
    build: ./client
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://api:5000/api
    depends_on:
      - api
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - client
      - api
    restart: unless-stopped
```

### 3. Deploy with Docker:
```bash
docker-compose up -d --build
```

---

## 🔒 Security Best Practices

### 1. SSL/TLS Configuration
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d rebelx.com -d www.rebelx.com
```

### 2. Security Headers
Add to Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Rate Limiting
Configure in Express:
```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Input Validation
- Sanitize all user inputs
- Use parameterized queries
- Validate file uploads
- Implement CSRF protection

---

## ⚡ Performance Optimization

### 1. Database Optimization
- Enable MongoDB connection pooling
- Implement query result caching
- Use aggregation pipelines efficiently
- Regular index maintenance

### 2. Caching Strategy
```javascript
// Redis caching example
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache frequently accessed data
const cacheMiddleware = (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  client.get(key, (err, data) => {
    if (data) {
      return res.json(JSON.parse(data));
    }
    next();
  });
};
```

### 3. CDN Configuration
- Use CloudFlare or AWS CloudFront
- Cache static assets
- Enable Brotli compression
- Optimize images

### 4. Frontend Optimization
```javascript
// Lazy loading components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));

// Code splitting
const loadComponent = () => {
  import('./HeavyComponent').then(module => {
    // Use component
  });
};
```

---

## 📊 Monitoring & Logging

### 1. Application Monitoring (Sentry)
```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Logging (Winston)
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 3. Health Checks
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### 4. Metrics Collection
- Use Prometheus for metrics
- Monitor response times
- Track error rates
- Monitor database performance

---

## 🔄 CI/CD Pipeline

### GitHub Actions Configuration

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "rebelx-v3-api"
          heroku_email: ${{secrets.HEROKU_EMAIL}}
          appdir: "server"

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          working-directory: ./client
```

---

## 💾 Backup & Recovery

### 1. Database Backup Strategy

**Automated Daily Backups:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="rebelx-v3-prod"

# MongoDB backup
mongodump --uri=$MONGODB_URI --out=$BACKUP_DIR/mongo_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/mongo_$DATE

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz s3://rebelx-backups/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
```

**Schedule with Cron:**
```bash
0 2 * * * /path/to/backup.sh
```

### 2. Recovery Procedure

**Restore from Backup:**
```bash
# Download backup from S3
aws s3 cp s3://rebelx-backups/backup_20240115.tar.gz .

# Extract
tar -xzf backup_20240115.tar.gz

# Restore to MongoDB
mongorestore --uri=$MONGODB_URI --drop backup_20240115/
```

### 3. Disaster Recovery Plan
1. **RTO (Recovery Time Objective):** 4 hours
2. **RPO (Recovery Point Objective):** 24 hours
3. **Backup Locations:**
   - Primary: AWS S3
   - Secondary: Google Cloud Storage
   - Tertiary: On-premise NAS

---

## 📝 Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow
- [ ] Verify payment processing
- [ ] Check email notifications
- [ ] Test file uploads
- [ ] Verify SSL certificate
- [ ] Check monitoring dashboards
- [ ] Test backup restoration
- [ ] Verify rate limiting
- [ ] Check error logging
- [ ] Test webhook endpoints
- [ ] Verify CORS settings
- [ ] Check database indexes
- [ ] Test search functionality
- [ ] Verify analytics tracking

---

## 🆘 Troubleshooting

### Common Issues and Solutions

1. **MongoDB Connection Issues:**
   - Check IP whitelist in Atlas
   - Verify connection string format
   - Check network connectivity

2. **CORS Errors:**
   - Verify CLIENT_URL in environment
   - Check allowed origins configuration
   - Ensure credentials are included

3. **Payment Processing Failures:**
   - Verify Stripe keys (live vs test)
   - Check webhook configuration
   - Verify SSL certificate

4. **Performance Issues:**
   - Check database indexes
   - Review query optimization
   - Implement caching
   - Scale server resources

5. **Authentication Problems:**
   - Verify JWT secret consistency
   - Check token expiration
   - Review CORS configuration

---

## 📞 Support Contacts

- **DevOps Team:** devops@rebelx.com
- **Security Team:** security@rebelx.com
- **Database Admin:** dba@rebelx.com
- **On-Call Engineer:** +1-555-0123

---

**Last Updated:** January 2024
**Version:** 1.0.0