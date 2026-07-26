# Vercel + Render deployment setup

## Frontend (Vercel)
- Build command: npm run build
- Output directory: dist
- Set these environment variables in Vercel:
  - VITE_API_URL=https://your-render-service-name.onrender.com

## Backend (Render)
- Create a web service for the backend folder: stocky-backend/backend
- Start command: npm start
- Set environment variables in Render:
  - PORT=4000
  - MONGODB_URI=your_mongodb_connection_string
  - MONGODB_DB=stocky
  - JWT_SECRET=your_secret
  - FINNHUB_API_KEY=your_optional_key

## Notes
- The frontend now defaults to /api in production and will use your Render backend URL when VITE_API_URL is set.
- The Vercel rewrite forwards /api requests to your Render service.
