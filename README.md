# Qix Ads Work Management System

A production-ready work management application for Qix Ads agency.

## Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (running locally or cloud)

## Setup Instructions

### 1. Database Setup

Ensure your PostgreSQL database is running. Update the `DATABASE_URL` in `server/.env` if it differs from the default.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qix_ads_db?schema=public"
```

### 2. Backend Setup

Open a terminal in the `server` directory:

```bash
cd server
npm install
npx prisma generate
npx prisma db push  # Pushes the schema to the DB
npm run dev
```

The server will start on `http://localhost:4000`.

### 3. Frontend Setup

Open a new terminal in the `client` directory:

```bash
cd client
npm install
npm run dev
```

The client will start on `http://localhost:5173`.

## Features

- **Auth**: Login, Register (with Role selection).
- **Dashboards**:
  - **Executive**: Campaign planning & Calendar.
  - **Designer**: Kanban board for tasks.
  - **Manager**: Analytics and Performance 
- **Tasks**: Create, Assign, Track status.

## Role Accounts for Testing

You can register new accounts, but here are the roles to try:
- `MARKETING_EXEC` (Executive Dashboard)
- `DESIGNER` (Kanban Dashboard)
- `MANAGER` (Analytics Dashboard)
