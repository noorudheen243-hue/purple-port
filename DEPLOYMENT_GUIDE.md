# Deployment Guide for Purple Port (Qix Ads)

This guide outlines the steps to host your full-stack application online. The application consists of three parts that need to be hosted:
1.  **Database** (PostgreSQL)
2.  **Backend API** (Node.js/Express)
3.  **Frontend Client** (React/Vite)

---

## 1. Database Hosting (PostgreSQL)
You need a cloud PostgreSQL database.
**Recommended Options:**
*   **Supabase** (Free tier available, easy setup)
*   **Neon** (Serverless, scales well)
*   **Render** (Good if hosting backend there too)

**Steps (using Supabase as example):**
1.  Sign up at [supabase.com](https://supabase.com).
2.  Create a new project.
3.  Go to **Project Settings** -> **Database**.
4.  Copy the **Connection String** (URI). It will look like:
    `postgresql://postgres:[PASSWORD]@db.project.supabase.co:5432/postgres`
5.  Save this string; you will need it for the Backend environment variables.

---

## 2. Backend Hosting (Node.js)
You need a server to run the Node.js API.
**Recommended Options:**
*   **Render** (Easiest, has free tier)
*   **Railway** (Developer friendly)
*   **Heroku** (Classic option)

**Steps (using Render as example):**
1.  Push your code to **GitHub** (if not already there).
2.  Sign up at [render.com](https://render.com).
3.  Click **New** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Settings**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install && npm run build` (or `npm install && npx prisma generate && npm run build`)
    *   **Start Command**: `npm start`
6.  **Environment Variables** (Add these in the Render dashboard):
    *   `DATABASE_URL`: (Paste the connection string from Step 1)
    *   `JWT_SECRET`: (Set a secure random string)
    *   `CORS_ORIGIN`: (Leave blank for now, or set to `*`. We will update this after deploying the frontend.)
    *   `PORT`: `10000` (Render default)
7.  Click **Create Web Service**.
8.  Wait for deployment. Once live, copy the **Service URL** (e.g., `https://qix-ads-api.onrender.com`).

---

## 3. Frontend Hosting (React)
The frontend is a static site built with Vite.
**Recommended Options:**
*   **Vercel** (Best for frontend, optimized for React)
*   **Netlify** (Very easy to use)

**Steps (using Vercel as example):**
1.  Sign up at [vercel.com](https://vercel.com).
2.  Click **Add New** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure Project**:
    *   **Root Directory**: Edit and select `client`.
    *   **Framework Preset**: Vite (should detect auto).
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables**:
    *   `VITE_API_URL`: (Paste the Backend Service URL from Step 2, e.g., `https://qix-ads-api.onrender.com`)
        *   *Note: Ensure NO trailing slash `/` at the end.*
6.  Click **Deploy**.
7.  Once deployed, copy the **Frontend Domain** (e.g., `https://purple-port.vercel.app`).

---

## 4. Final Configuration
Now that both sides are live, link them securely.

1.  **Update Backend CORS**:
    *   Go back to your Backend host (e.g., Render).
    *   Update the `CORS_ORIGIN` environment variable to match your *Frontend Domain* (e.g., `https://purple-port.vercel.app`).
    *   This ensures only your frontend can talk to your backend.

2.  **Database Migration**:
    *   Since this is a fresh cloud database, it will be empty.
    *   You may need to run migrations from your local machine connecting to the *cloud* database, or set up a build command in the backend to migrate on deploy (`npx prisma db push`).

**Congratulations! Your app is now live.**
