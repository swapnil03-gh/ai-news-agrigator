// api/news.js
import fetch from 'node-fetch';
export default async function handler(req, res, newsApiKey) {
  const { q, lang = 'en', max = 10 } = req.query; // Set default max to 10 for Newsdata.io free plan compatibility, as per documentation
  const NEWS_API_KEY = newsApiKey || process.env.NEWS_API_KEY; // Use passed key or Vercel environment variable
  console.log("Serverless Function: NEWS_API_KEY (from process.env):", process.env.NEWS_API_KEY ? "Set" : "Not Set");
  console.log("Serverless Function: newsApiKey (passed argument):", newsApiKey ? "Set" : "Not Set");
  console.log("Serverless Function: Final NEWS_API_KEY being used:", NEWS_API_KEY ? "Set" : "Not Set");
  console.log("Serverless Function: Actual NEWS_API_KEY value:", NEWS_API_KEY ? `${NEWS_API_KEY.substring(0, 5)}...${NEWS_API_KEY.substring(NEWS_API_KEY.length - 5)}` : 'Not Set'); // Mask the key for logs

  if (!NEWS_API_KEY || NEWS_API_KEY === 'YOUR_NEWS_API_KEY' || NEWS_API_KEY.length < 10) {
    console.error("Serverless Function: NEWS_API_KEY is missing or invalid.");
    return res.status(500).json({ error: "News API key not configured or invalid. Please ensure NEWS_API_KEY is set in Vercel environment variables." });
  }

  const GNEWS_API_URL = 'https://gnews.io/api/v4/search'; // Changed to GNews API URL
  const apiUrl = `${GNEWS_API_URL}?apikey=${NEWS_API_KEY}&q=${q}&lang=${lang}&max=${max}`; // Updated for GNews API

  try {
    console.log("Serverless Function: Fetching from API URL:", apiUrl);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Serverless Function: GNews API error:", errorData);
      // Return the full errorData to the client for better debugging
      return res.status(response.status).json({ error: errorData.message || `GNews API error! status: ${response.status}`, details: errorData });
    }

    const data = await response.json();
    console.log("Serverless Function: Raw API response data:", data); // Log the raw data
    res.status(200).json(data);
  } catch (error) {
    console.error("Serverless Function: Failed to fetch news:", error);
    res.status(500).json({ error: `Failed to fetch news: ${error.message}` });
  }
}
