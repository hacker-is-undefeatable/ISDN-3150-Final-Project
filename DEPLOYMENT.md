Vercel Deployment (Vite)

Add a `vercel.json` file at the project root to ensure client-side routes work correctly on Vercel (so refreshing on a nested route doesn't show a 404).

Example `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

On the Vercel deployment dashboard, choose the **Vite** framework preset for this project.

This configuration rewrites all incoming paths to the SPA root so client-side routing works after refresh.

For more details, see the Vercel docs for deploying single-page apps / Vite projects.
