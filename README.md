# Project Management System

A modern full-stack project management system built with Django GraphQL backend and Next.js frontend, featuring user authentication, project management, task tracking, and team collaboration.

## <� Architecture

This is a monorepo containing:

- **Backend** (`/backend`): Django + GraphQL API with PostgreSQL
- **Frontend** (`/frontend`): Next.js 15 + Apollo Client + TypeScript

## =� Features

- **Authentication & Authorization**: JWT-based auth with role-based permissions
- **Project Management**: Create, edit, and manage projects with status tracking
- **Task Management**: Kanban board, task assignment, and progress tracking
- **Team Collaboration**: Multi-user support with organization-based access
- **Real-time Updates**: GraphQL subscriptions for live data updates
- **Responsive UI**: Modern interface built with Tailwind CSS

## =� Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **npm or pnpm**

## =� Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mini-project-management-system
```

### 2. Database Setup

#### Install PostgreSQL

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE project_management_db;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE project_management_db TO postgres;
\q
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env file with your database credentials and other settings

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Seed database with sample data (optional but recommended for development)
python manage.py seed_db

# Start development server
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

- **GraphQL Playground**: `http://localhost:8000/graphql/`
- **Django Admin**: `http://localhost:8000/admin/`
- **Health Check**: `http://localhost:8000/health/`

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your GraphQL endpoint

# Start development server
npm run dev
# or
pnpm dev
```

The frontend will be available at `http://localhost:3000`

### 5. Verify Setup

1. **Backend Health Check**: Visit `http://localhost:8000/health/`
2. **GraphQL Playground**: Visit `http://localhost:8000/graphql/`
3. **Frontend Application**: Visit `http://localhost:3000`

## =' Configuration

### Backend Environment Variables (`.env`)

```env
# Database Configuration
DB_NAME=project_management_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432

# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=86400

# GraphQL Configuration
GRAPHQL_URL=/graphql/
GRAPHIQL=True
```

### Frontend Environment Variables (`.env.local`)

```env
GRAPHQL_ENDPOINT=http://localhost:8000/graphql/
```

## 🌱 Database Seeding

The project includes a comprehensive database seeding command to populate your development database with realistic sample data.

### Basic Usage

```bash
cd backend
python manage.py seed_db
```

This creates:

- **3 sample organizations** (TechCorp Solutions, Design Studio Pro, StartupLab Inc)
- **10 users per organization** with different roles (admin, manager, developer, designer, tester)
- **5 projects per organization** with various statuses and realistic descriptions
- **20 tasks per project** with different statuses, assignees, and due dates
- **Random task comments** for collaboration simulation

### Advanced Options

```bash
# Delete all existing data and reseed
python manage.py seed_db --flush

# Customize the number of records
python manage.py seed_db --users 15 --projects 8 --tasks 25

# Create minimal dataset
python manage.py seed_db --users 5 --projects 2 --tasks 10
```

### Sample Login Credentials

After seeding, you can log in with any of these accounts:

**TechCorp Solutions:**

- Admin: `john.smith@techcorp-solutions.com` / `password123`
- Manager: `sarah.johnson@techcorp-solutions.com` / `password123`
- Developer: `mike.davis@techcorp-solutions.com` / `password123`

**Design Studio Pro:**

- Admin: `john.smith@design-studio-pro.com` / `password123`
- Manager: `sarah.johnson@design-studio-pro.com` / `password123`
- Designer: `emily.brown@design-studio-pro.com` / `password123`

**StartupLab Inc:**

- Admin: `john.smith@startuplab-inc.com` / `password123`
- Manager: `sarah.johnson@startuplab-inc.com` / `password123`
- Developer: `david.wilson@startuplab-inc.com` / `password123`

### What Gets Created

The seed script creates realistic data including:

#### Organizations

- Complete organization profiles with contact information
- Unique slugs for multi-tenant access
- Active status and descriptions

#### Users

- Verified email addresses
- Proper role assignments (admin, manager, developer, designer, tester)
- Organization-specific email addresses
- Admin privileges for organization management

#### Projects

- Various project types (Mobile App, Website Redesign, API Integration, etc.)
- Different statuses (Planning, Active, Completed, On Hold, Cancelled)
- Realistic descriptions and due dates
- Organization-scoped access

#### Tasks

- Comprehensive task lists for each project
- Different statuses (TODO, IN_PROGRESS, DONE)
- Random assignee distribution
- Due dates and detailed descriptions
- Task comments for collaboration examples

### Resetting Data

To completely reset your database:

```bash
# Option 1: Use the flush flag
python manage.py seed_db --flush

# Option 2: Manual database reset
python manage.py flush
python manage.py migrate
python manage.py seed_db
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
python manage.py test
# or with pytest
pytest
```

### Frontend Tests

```bash
cd frontend
npm run test
# or
pnpm test
```

## =� Production Deployment

### Backend (Django)

```bash
# Install production dependencies
pip install gunicorn

# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn project_management.wsgi:application --bind 0.0.0.0:8000
```

### Frontend (Next.js)

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## =� Available Scripts

### Backend

- `python manage.py runserver` - Start development server
- `python manage.py test` - Run tests
- `python manage.py makemigrations` - Create database migrations
- `python manage.py migrate` - Apply database migrations
- `python manage.py createsuperuser` - Create admin user
- `python manage.py seed_db` - Seed database with sample data
- `python manage.py seed_db --flush` - Reset and seed database
- `python manage.py flush` - Clear all database data

### Frontend

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## =� API Documentation

### GraphQL Schema

The GraphQL schema includes:

#### Types

- **User**: User accounts and authentication
- **Organization**: Multi-tenant organization support
- **Project**: Project management with status tracking
- **Task**: Task management with assignments and priorities
- **Comment**: Task comments and collaboration

#### Mutations

- `login(email, password)` - User authentication
- `register(email, password, firstName, lastName)` - User registration
- `createProject(name, description)` - Create new project
- `updateProject(id, data)` - Update project
- `createTask(projectId, data)` - Create new task
- `updateTask(id, data)` - Update task

#### Queries

- `me` - Current user profile
- `projects` - List user projects
- `project(id)` - Get specific project
- `tasks(projectId)` - List project tasks

Visit `http://localhost:8000/graphql/` for the interactive GraphQL playground.

## =' Tech Stack

### Backend

- **Django 4.2** - Web framework
- **Graphene-Django** - GraphQL integration
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Django REST Framework** - API utilities

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Apollo Client** - GraphQL client
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Beautiful DnD** - Drag and drop

## > Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## =� License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## <� Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Port Already in Use**

   - Frontend: Change port with `npm run dev -- -p 3001`
   - Backend: Use `python manage.py runserver 0.0.0.0:8001`

3. **CORS Issues**

   - Verify `CORS_ALLOWED_ORIGINS` in backend `.env`
   - Check frontend URL in backend settings

4. **GraphQL Endpoint Not Found**
   - Ensure backend is running on `http://localhost:8000`
   - Check `GRAPHQL_ENDPOINT` in frontend `.env.local`

### Reset Database

```bash
cd backend
python manage.py flush
python manage.py migrate
```

### Clear Node Modules

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

For more help, please open an issue or check the project documentation.
