# GitHub Setup Guide

Follow these steps to upload your project to GitHub.

## Prerequisites
1.  Make sure you have **Git** installed on your computer.
    *   To check, open a terminal (Command Prompt or PowerShell) and run: `git --version`
2.  Make sure you have a **GitHub Account**. (Sign up at [github.com](https://github.com)).

## Step 1: Create a Repository on GitHub
1.  Log in to your GitHub account.
2.  Click the **+** icon in the top-right corner and select **New repository**.
3.  **Repository name**: `purple-port` (or any name you like).
4.  **Public/Private**: Choose **Private** (recommended for projects with client code).
5.  **Initialize this repository with**: DO NOT check any boxes (No README, no gitignore). We want an empty repository.
6.  Click **Create repository**.
7.  Copy the URL of your new repository. It will look like:
    `https://github.com/YOUR_USERNAME/purple-port.git`

## Step 2: Initialize Git Locally
Open your terminal (PowerShell) in the project folder `f:\Antigravity` and run these commands one by one:

```powershell
# 1. Initialize Git
git init

# 2. Add all files to staging
# (This prepares them to be saved. It might take a moment if you have many files)
git add .

# 3. Commit the files
# (This saves the current state)
git commit -m "Initial commit: Full Stack Project"

# 4. Rename the branch to main (Standard practice)
git branch -M main
```

## Step 3: Connect and Push
Replace `YOUR_REPO_URL` with the URL you copied in Step 1.

```powershell
# 5. Link your local project to GitHub
git remote add origin YOUR_REPO_URL
# Example: git remote add origin https://github.com/johndoe/purple-port.git

# 6. Push your code to GitHub
git push -u origin main
```

## Common Issues & Fixes
*   **"Authentication failed"**: GitHub no longer uses passwords for the command line. You might need to set up a **Personal Access Token** or use **Git Credential Manager** (which usually pops up a browser window to login).
*   **"remote origin already exists"**: If you messed up the URL, run `git remote remove origin` and try step 5 again.
