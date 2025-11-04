import http from 'http';
import { parse } from 'url';
import handler from './news.js';
import rssHandler from './rss.js'; // Import the new RSS handler
import dotenv from 'dotenv'; // Import dotenv

dotenv.config(); // Load environment variables from .env file

const PORT = process.env.PORT || 3001; // Use a different port than Vite's default

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  req.query = parsedUrl.query; // Attach query parameters to req.query

  // Simulate Vercel's serverless function context
  const vercelRes = {
    status: (statusCode) => {
      res.statusCode = statusCode;
      return vercelRes;
    },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    setHeader: (name, value) => {
      res.setHeader(name, value);
    }
  };

  // Route requests based on URL
  if (parsedUrl.pathname === '/api/news') {
    await handler(req, vercelRes, process.env.NEWS_API_KEY);
  } else if (parsedUrl.pathname === '/api/rss') { // New RSS route
    await rssHandler(req, vercelRes);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
});
