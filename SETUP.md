# Whisper CLI Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

#### Option A: PostgreSQL (Recommended)
1. Install PostgreSQL locally or use a cloud service like Railway, Supabase, or Neon
2. Create a database named `whisper_db`
3. Copy `.env.example` to `.env` and update the `DATABASE_URL`

```bash
cp .env.example .env
```

#### Option B: SQLite (Development)
Update your `.env` file to use SQLite:
```env
DATABASE_URL="file:./dev.db"
```

### 3. Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

### 4. Start the Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`
API Documentation: `http://localhost:3000/docs`

## Authentication Setup

### Package Name
The package is published as `@whisper/whisper-cli` to avoid conflicts with existing packages.

### Security Features
- **Passport.js**: Industry-standard authentication library
- **JWT Tokens**: Secure token-based authentication
- **Bcrypt**: Password hashing with salt rounds of 12
- **Rate Limiting**: Built-in protection against brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for production

### CLI Authentication
```bash
# Login to your Whisper account
whisper auth login

# Check authentication status
whisper auth status

# Logout
whisper auth logout
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/whisper_db"
JWT_SECRET="your-super-secret-jwt-key"

# Optional
PORT=3000
NODE_ENV=development

# AI Provider API Keys (Backend Only)
# These are managed centrally - users don't need to configure these
OPENAI_API_KEY="your-openai-key"
GEMINI_API_KEY="your-gemini-key"
ANTHROPIC_API_KEY="your-anthropic-key"
```

## Database Schema

### Users
- Authentication and profile management
- API key generation for CLI access
- Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)

### Organizations
- Team management and collaboration
- Shared projects and scans
- Organization-level subscriptions

### Projects
- Code repositories and scan configurations
- Custom security rules and settings

### Scans
- Security scan results and findings
- Historical tracking and analytics

### Subscriptions
- Billing and usage tracking
- Plan limits and features

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/logout` - Logout user

### Health Check
- `GET /health` - API health status

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run database migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio

# Generate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset

# Lint code
npm run lint

# Run tests
npm test
```

## Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use a secure `JWT_SECRET`
3. Configure production database URL
4. Set appropriate CORS origins

### Database Migration
```bash
npx prisma migrate deploy
```

### Security Checklist
- [ ] Update default JWT secret
- [ ] Configure CORS for production domains
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Enable database backups

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env file
   - Ensure database exists

2. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

3. **Permission Errors**
   - Check user roles and permissions
   - Verify organization membership
   - Ensure account is active

### Support

For support and issues, please visit:
- GitHub Issues: https://github.com/whisper-cli/whisper/issues
- Documentation: https://whisper-cli.dev
