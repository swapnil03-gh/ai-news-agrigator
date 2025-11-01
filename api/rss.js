import RSSParser from 'rss-parser';
import fetch from 'node-fetch'; // node-fetch is needed for RSSParser in Node.js environment

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "RSS Feed URL is required." });
  }

  try {
    console.log("Serverless Function: Fetching RSS feed from:", url);
    const parser = new RSSParser();
    const feed = await parser.parseURL(url); // Directly parse the URL in the backend

    const articles = feed.items.map((item, index) => ({
      id: `${item.guid || item.link}-${index}`,
      title: item.title,
      summary: item.contentSnippet || item.summary || item.content || 'No summary available.',
      source: feed.title || 'RSS Feed',
      date: item.pubDate,
      category: 'RSS Feeds',
      image: item.enclosure && item.enclosure.url ? item.enclosure.url : 'https://via.placeholder.com/400x200?text=No+Image',
      url: item.link,
      trending: false,
      language: item.language || "en"
    }));

    res.status(200).json({ results: articles });
  } catch (error) {
    console.error("Serverless Function: Failed to fetch or parse RSS feed:", error);
    res.status(500).json({ error: `Failed to fetch or parse RSS feed: ${error.message}` });
  }
}
