# Salon SaaS — Enterprise Multi-Tenant Salon Platform

Salon SaaS is a production-ready, feature-gated, multi-tenant software-as-a-service application designed for salon chains, spa franchises, and single stylists. Built using Next.js 15, React 19, Drizzle ORM, NextAuth v5, Upstash Redis, and Inngest for background jobs.

## Tech Stack Mappings

| Layer | Technology |
| --- | --- |
| Core Framework | Next.js 15 App Router + React 19 + TypeScript |
| Database & ORM | Neon Serverless PostgreSQL + Drizzle ORM |
| Background Jobs | Inngest Event-Driven Jobs |
| Auth | NextAuth v5 |
| Cache & RL | Upstash Redis + Upstash Rate Limit |
| Styling | Tailwind CSS + shadcn/ui (Radix UI + CVA) |
| Integrations | Stripe, Razorpay, Resend, Cloudinary |

---

## Environment Configuration

Copy `.env.example` to `.env.local` and fill in the values:
- `DATABASE_URL`: Connection string for Neon serverless postgres
- `NEXTAUTH_SECRET`: Secret hash for NextAuth
- `UPSTASH_REDIS_REST_URL`: REST Endpoint for Upstash Redis cache

---

## Directory Installation & Quick Start

1. **Install and Build**:
   ```bash
   bash scripts/setup.sh
   ```
2. **Execute Development Engine**:
   ```bash
   npm run dev
   ```
3. **Background Jobs Console**:
   ```bash
   npx inngest-cli@latest dev
   ```

---

## Modular Features Mappings (16 Key Features)

- `MULTI_BRANCH`: Manage multiple branch allocations and locations
- `BASIC_REPORTS`: Access standard business metrics
- `APPOINTMENTS`: Booking panels and calendar matrix
- `STAFF_MGMT`: Team stylist commission assignments
- `ATTENDANCE`: Daily check-in/out attendance logs
- `PAYROLL`: Salaried payroll draft generator
- `CRM`: Customer profiles and loyalty logs
- `BILLING`: Tax invoice generators and payments

---

## Sprint Implementation Plan
- **Sprint 1 (DB Schema & Seed)**: Initialize neon-drizzle configurations
- **Sprint 2 (Auth & Middleware)**: Set credentials provider, nextauth and x-tenant-id session injectors
- **Sprint 3 (Branch Setup)**: Configure working hours and calendar slot logic
- **Sprint 4 (Appointments Calendar)**: Build interactive matrix of daily slots
- **Sprint 5 (Staff & Payroll)**: Commissions calculations and auto-payroll background runner
