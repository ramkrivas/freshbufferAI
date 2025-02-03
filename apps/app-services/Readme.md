📂 apps/
    📂 app-services/    # FreshbufferAI (monorepo structure)
        📂 src/
            📂 modules/
                📂 user/
                    📂 application/  # Use Cases (Business Logic)
                        📄 create-user.use-case.ts
                        📄 get-user.use-case.ts
                    📂 domain/  # Entities, Aggregates, Value Objects, Interfaces
                        📄 user.entity.ts
                        📄 user.repository.ts (Interface)
                        📄 user.value-object.ts
                    📂 infrastructure/  # Repositories, Database, API Clients
                        📄 user.repository.impl.ts
                    📂 presentation/  # Controllers, Routes
                        📄 user.controller.ts
                        📄 user.routes.ts
                📂 auth/   # Another Module
                    📂 application/
                    📂 domain/
                    📂 infrastructure/
                    📂 presentation/
            📂 core/  # Shared Logic across Modules
                📂 application/
                    📄 base.use-case.ts  # Abstract base for use cases
                📂 domain/
                    📄 base.entity.ts  # Abstract base for entities
                    📄 base.repository.ts
                📂 infrastructure/
                    📄 database.ts  # Database connection (e.g., Prisma, TypeORM)
                    📄 logger.ts  # Logging Utility (e.g., Winston, Pino)
                📂 presentation/
                    📄 error-handler.middleware.ts
                    📄 validation.middleware.ts
            📂 config/  # Environment Variables & Configuration
                📄 app.config.ts
                📄 db.config.ts
            📂 server.ts  # Express App Entry Point
            📂 app.ts  # Bootstraps Express & Middlewares
