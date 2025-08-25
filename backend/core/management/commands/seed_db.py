"""
Django management command to seed the database with sample data.

This command creates sample organizations, users, projects, and tasks
for development and testing purposes.
"""

import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.utils.text import slugify

from accounts.models import User
from core.models import Organization, Project, Task, TaskComment


class Command(BaseCommand):
    help = 'Seed the database with sample data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete all existing data before seeding',
        )
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of users to create per organization (default: 10)',
        )
        parser.add_argument(
            '--projects',
            type=int,
            default=5,
            help='Number of projects to create per organization (default: 5)',
        )
        parser.add_argument(
            '--tasks',
            type=int,
            default=20,
            help='Number of tasks to create per project (default: 20)',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write(
                self.style.WARNING('Flushing existing data...')
            )
            self.flush_data()

        try:
            with transaction.atomic():
                self.stdout.write('Starting database seeding...')
                
                # Create organizations
                organizations = self.create_organizations()
                self.stdout.write(
                    self.style.SUCCESS(f'Created {len(organizations)} organizations')
                )

                # Create users for each organization
                all_users = []
                for org in organizations:
                    users = self.create_users(org, options['users'])
                    all_users.extend(users)
                
                self.stdout.write(
                    self.style.SUCCESS(f'Created {len(all_users)} users')
                )

                # Create projects for each organization
                all_projects = []
                for org in organizations:
                    org_users = [u for u in all_users if u.organization == org]
                    projects = self.create_projects(org, org_users, options['projects'])
                    all_projects.extend(projects)
                
                self.stdout.write(
                    self.style.SUCCESS(f'Created {len(all_projects)} projects')
                )

                # Create tasks for each project
                total_tasks = 0
                total_comments = 0
                for project in all_projects:
                    org_users = [u for u in all_users if u.organization == project.organization]
                    tasks = self.create_tasks(project, org_users, options['tasks'])
                    comments = self.create_task_comments(tasks, org_users)
                    total_tasks += len(tasks)
                    total_comments += len(comments)
                
                self.stdout.write(
                    self.style.SUCCESS(f'Created {total_tasks} tasks')
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Created {total_comments} task comments')
                )

                self.stdout.write(
                    self.style.SUCCESS('\n=== Database seeding completed successfully! ===')
                )
                self.display_summary(organizations, all_users)

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during seeding: {str(e)}')
            )
            raise CommandError(f'Seeding failed: {str(e)}')

    def flush_data(self):
        """Delete all existing data."""
        TaskComment.objects.all().delete()
        Task.objects.all().delete()
        Project.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Organization.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Existing data flushed'))

    def create_organizations(self):
        """Create sample organizations."""
        org_data = [
            {
                'name': 'TechCorp Solutions',
                'contact_email': 'admin@techcorp.com',
                'description': 'Leading technology solutions provider specializing in enterprise software development and digital transformation.'
            },
            {
                'name': 'Design Studio Pro',
                'contact_email': 'hello@designstudio.com',
                'description': 'Creative design agency focused on user experience design and brand identity development.'
            },
            {
                'name': 'StartupLab Inc',
                'contact_email': 'team@startuplab.com',
                'description': 'Innovation hub supporting early-stage startups with technology development and business strategy.'
            }
        ]

        organizations = []
        for data in org_data:
            org, created = Organization.objects.get_or_create(
                slug=slugify(data['name']),
                defaults={
                    'name': data['name'],
                    'contact_email': data['contact_email'],
                    'description': data['description'],
                    'is_active': True,
                }
            )
            organizations.append(org)

        return organizations

    def create_users(self, organization, count):
        """Create sample users for an organization."""
        user_data = [
            {'first_name': 'John', 'last_name': 'Smith', 'role': 'admin'},
            {'first_name': 'Sarah', 'last_name': 'Johnson', 'role': 'manager'},
            {'first_name': 'Mike', 'last_name': 'Davis', 'role': 'developer'},
            {'first_name': 'Emily', 'last_name': 'Brown', 'role': 'designer'},
            {'first_name': 'David', 'last_name': 'Wilson', 'role': 'developer'},
            {'first_name': 'Lisa', 'last_name': 'Garcia', 'role': 'tester'},
            {'first_name': 'James', 'last_name': 'Martinez', 'role': 'developer'},
            {'first_name': 'Maria', 'last_name': 'Rodriguez', 'role': 'manager'},
            {'first_name': 'Robert', 'last_name': 'Anderson', 'role': 'developer'},
            {'first_name': 'Jennifer', 'last_name': 'Taylor', 'role': 'designer'},
            {'first_name': 'Chris', 'last_name': 'Thomas', 'role': 'developer'},
            {'first_name': 'Amy', 'last_name': 'Jackson', 'role': 'tester'},
            {'first_name': 'Kevin', 'last_name': 'White', 'role': 'manager'},
            {'first_name': 'Michelle', 'last_name': 'Harris', 'role': 'designer'},
            {'first_name': 'Brian', 'last_name': 'Clark', 'role': 'developer'}
        ]

        users = []
        for i in range(min(count, len(user_data))):
            data = user_data[i]
            email = f"{data['first_name'].lower()}.{data['last_name'].lower()}@{organization.slug}.com"
            username = f"{data['first_name'].lower()}.{data['last_name'].lower()}.{organization.slug}"
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'organization': organization,
                    'is_organization_admin': data['role'] == 'admin',
                    'email_verified': True,
                    'email_verified_at': timezone.now(),
                    'password': make_password('password123'),  # Default password for development
                    'is_active': True,
                }
            )
            users.append(user)

        return users

    def create_projects(self, organization, users, count):
        """Create sample projects for an organization."""
        project_templates = [
            {
                'name': 'Mobile App Development',
                'description': 'Development of a cross-platform mobile application with React Native, featuring user authentication, real-time messaging, and offline capabilities.',
                'status': 'ACTIVE'
            },
            {
                'name': 'Website Redesign',
                'description': 'Complete redesign of the company website with modern UI/UX, improved performance, and responsive design for all devices.',
                'status': 'PLANNING'
            },
            {
                'name': 'API Integration Project',
                'description': 'Integration of third-party APIs for payment processing, analytics, and customer relationship management systems.',
                'status': 'ACTIVE'
            },
            {
                'name': 'Database Migration',
                'description': 'Migration from legacy database system to modern cloud-based solution with improved performance and scalability.',
                'status': 'COMPLETED'
            },
            {
                'name': 'E-commerce Platform',
                'description': 'Development of a full-featured e-commerce platform with inventory management, payment processing, and analytics dashboard.',
                'status': 'ACTIVE'
            },
            {
                'name': 'DevOps Infrastructure',
                'description': 'Setup of CI/CD pipelines, containerization with Docker, and deployment automation for improved development workflow.',
                'status': 'ON_HOLD'
            },
            {
                'name': 'Security Audit',
                'description': 'Comprehensive security audit of existing systems, vulnerability assessment, and implementation of security best practices.',
                'status': 'PLANNING'
            }
        ]

        projects = []
        for i in range(count):
            template = project_templates[i % len(project_templates)]
            project_name = f"{template['name']} - Phase {(i // len(project_templates)) + 1}"
            
            # Generate due date (1-6 months from now)
            due_date = timezone.now().date() + timedelta(days=random.randint(30, 180))
            
            project, created = Project.objects.get_or_create(
                organization=organization,
                name=project_name,
                defaults={
                    'description': template['description'],
                    'status': template['status'],
                    'due_date': due_date,
                }
            )
            projects.append(project)

        return projects

    def create_tasks(self, project, users, count):
        """Create sample tasks for a project."""
        task_templates = [
            {'title': 'Setup development environment', 'status': 'DONE'},
            {'title': 'Create database schema', 'status': 'DONE'},
            {'title': 'Implement user authentication', 'status': 'IN_PROGRESS'},
            {'title': 'Design user interface mockups', 'status': 'TODO'},
            {'title': 'Develop REST API endpoints', 'status': 'IN_PROGRESS'},
            {'title': 'Write unit tests', 'status': 'TODO'},
            {'title': 'Implement frontend components', 'status': 'IN_PROGRESS'},
            {'title': 'Setup CI/CD pipeline', 'status': 'TODO'},
            {'title': 'Perform code review', 'status': 'TODO'},
            {'title': 'Deploy to staging environment', 'status': 'TODO'},
            {'title': 'Conduct user testing', 'status': 'TODO'},
            {'title': 'Fix reported bugs', 'status': 'IN_PROGRESS'},
            {'title': 'Optimize database queries', 'status': 'TODO'},
            {'title': 'Implement caching strategy', 'status': 'TODO'},
            {'title': 'Update documentation', 'status': 'TODO'},
            {'title': 'Security vulnerability scan', 'status': 'TODO'},
            {'title': 'Performance optimization', 'status': 'TODO'},
            {'title': 'Mobile responsiveness testing', 'status': 'TODO'},
            {'title': 'Integration testing', 'status': 'TODO'},
            {'title': 'Production deployment', 'status': 'TODO'},
        ]

        tasks = []
        for i in range(count):
            template = task_templates[i % len(task_templates)]
            
            # Assign random user from organization
            assignee = random.choice(users) if users and random.random() > 0.2 else None
            
            # Generate due date (1-30 days from now for pending tasks)
            due_date = None
            if random.random() > 0.3:  # 70% of tasks have due dates
                days_ahead = random.randint(1, 30)
                due_date = timezone.now() + timedelta(days=days_ahead)
            
            # Add variety to descriptions
            descriptions = [
                f"Detailed implementation of {template['title'].lower()} with thorough testing and documentation.",
                f"Critical task: {template['title']} - requires immediate attention and coordination with team members.",
                f"Enhancement task for {template['title']} - focus on user experience and performance improvements.",
                f"Research and implementation of {template['title']} following industry best practices.",
                f"Collaborative effort for {template['title']} - involves multiple team members and stakeholders."
            ]
            
            task = Task.objects.create(
                project=project,
                title=f"{template['title']} - {project.name}",
                description=random.choice(descriptions),
                status=template['status'],
                assignee_email=assignee.email if assignee else '',
                due_date=due_date,
            )
            tasks.append(task)

        return tasks

    def create_task_comments(self, tasks, users):
        """Create sample comments for tasks."""
        comment_templates = [
            "Great progress on this task! The implementation looks solid.",
            "I've reviewed the code and left some suggestions in the pull request.",
            "This is blocked by the API integration task. We need to finish that first.",
            "Updated the requirements based on client feedback. Please review.",
            "Testing revealed some edge cases. Added them to the acceptance criteria.",
            "The design mockups are ready for review. Check the shared folder.",
            "Performance looks good in staging. Ready for production deployment.",
            "Found a potential security issue. Let's discuss the fix approach.",
            "Documentation is complete. Added examples and troubleshooting guide.",
            "Integration with third-party service is working as expected.",
        ]

        comments = []
        for task in tasks:
            # Random number of comments per task (0-3)
            comment_count = random.randint(0, 3)
            
            for _ in range(comment_count):
                if users:
                    author = random.choice(users)
                    comment = TaskComment.objects.create(
                        task=task,
                        content=random.choice(comment_templates),
                        author_email=author.email,
                    )
                    comments.append(comment)

        return comments

    def display_summary(self, organizations, users):
        """Display a summary of created data."""
        self.stdout.write('\n=== SEEDING SUMMARY ===')
        
        for org in organizations:
            org_users = [u for u in users if u.organization == org]
            admin_users = [u for u in org_users if u.is_organization_admin]
            
            self.stdout.write(f'\n📊 Organization: {org.name}')
            self.stdout.write(f'   └── Users: {len(org_users)} (Admins: {len(admin_users)})')
            self.stdout.write(f'   └── Projects: {org.projects.count()}')
            self.stdout.write(f'   └── Tasks: {sum(p.tasks.count() for p in org.projects.all())}')
            
            # Display sample login credentials
            if admin_users:
                admin = admin_users[0]
                self.stdout.write(f'   └── Admin Login: {admin.email} / password123')

        self.stdout.write('\n🔑 Default password for all users: password123')
        self.stdout.write('🌐 Access GraphQL playground at: http://localhost:8000/graphql/')
        self.stdout.write('📱 Access frontend at: http://localhost:3000/')