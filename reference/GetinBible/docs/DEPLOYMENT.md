# Deployment Guide - Vercel

## Prerequisites

Before deploying, you'll need:
1. A Vercel account (sign up at https://vercel.com)
2. Your Supabase credentials (URL and Anon Key)
3. (Optional) Gemini API key for AI features

## Step-by-Step Deployment Instructions

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```
   Enter your email: `cklbc.koho@gmail.com`

3. **Deploy**
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? `wisdom-prism` (or your preferred name)
   - In which directory is your code located? `./` (press Enter)
   - Want to override settings? **N**

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_GEMINI_API_KEY
   ```

   Paste each value when prompted, and select:
   - Production: **Y**
   - Preview: **Y**
   - Development: **Y**

5. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Login with `cklbc.koho@gmail.com`

3. **Import Project**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

4. **Add Environment Variables**
   In the "Environment Variables" section, add:
   ```
   VITE_SUPABASE_URL = your_supabase_url
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
   VITE_GEMINI_API_KEY = your_gemini_api_key (optional)
   ```

5. **Deploy**
   Click "Deploy" and wait for the build to complete.

## Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on "Settings" (gear icon)
3. Navigate to "API"
4. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon/public key** → Use for `VITE_SUPABASE_ANON_KEY`

## Getting a Gemini API Key (Optional)

1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key → Use for `VITE_GEMINI_API_KEY`

## Post-Deployment

After deployment:
1. Your app will be live at `https://your-project.vercel.app`
2. Test the admin interface at `https://your-project.vercel.app/admin`
3. Test the student interface at `https://your-project.vercel.app`

## Updating Your Deployment

To update your deployment after making changes:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

If using Vercel CLI:
```bash
vercel --prod
```

Vercel will automatically redeploy when you push to GitHub if connected via the dashboard.

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Ensure `npm run build` works locally first

### Routes Not Working
- The `vercel.json` file should handle SPA routing
- Make sure it's committed to the repository

### Environment Variables Not Working
- Remember: All Vite environment variables must start with `VITE_`
- Redeploy after adding new environment variables
- Check the Vercel deployment logs for any errors

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Project Issues: Check the browser console for errors
