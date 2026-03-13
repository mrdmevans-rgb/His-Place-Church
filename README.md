# His Place Community Church React Site

This is a Vite + React site ready for Vercel.

## Local setup

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Deploy to Vercel

### Option 1: GitHub
1. Create a new GitHub repo.
2. Upload all files from this folder.
3. In Vercel, click **Add New Project**.
4. Import the GitHub repo.
5. Click **Deploy**.

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel
```

## Domain setup with GoDaddy
1. Deploy the site first and confirm the `vercel.app` URL works.
2. In Vercel, open the project and go to **Settings > Domains**.
3. Add your domain and `www` version.
4. Vercel will show the DNS records to add in GoDaddy.
5. In GoDaddy, open your domain DNS settings and add the exact records Vercel shows.

## Files to edit
- `src/App.jsx` for page content
- `src/styles.css` for design and layout

## Images
- `src/assets/logo.jpg`
- `src/assets/pastor-family.jpg`

## Important placeholders
- Update the giving link in `src/App.jsx`
- Update the church email in `src/App.jsx`
- Update times and location if needed
