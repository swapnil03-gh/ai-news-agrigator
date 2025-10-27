import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Sun, Moon, Bell, Bookmark, BookmarkCheck, TrendingUp, Zap, Brain, Building, Shield, Settings, Clock, Globe, FileText, AlertCircle, Rss } from 'lucide-react'; // Added Moon for theme toggle, Rss for RSS feed
import RSSParser from 'rss-parser';

// Helper to apply dark class to HTML element
const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const categories = [
  { id: 'all', name: 'All News', icon: Zap, query: 'AI' },
  { id: 'research', name: 'AI Research', icon: Brain, query: 'AI Research' },
  { id: 'startups', name: 'AI Startups', icon: Building, query: 'AI Startups' },
  { id: 'policy', name: 'AI Policy & Ethics', icon: Shield, query: 'AI Policy' },
  { id: 'tools', name: 'AI Tools & Applications', icon: Settings, query: 'AI Tools' },
  { id: 'business', name: 'AI Business News', icon: TrendingUp, query: 'AI Business' },
  { id: 'rss', name: 'RSS Feeds', icon: Rss, query: '' } // New category for RSS feeds
];

export default function App() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // Changed to 'all' to temporarily disable RSS for testing
  const [savedArticles, setSavedArticles] = useState(new Set());
  const [showNotifications, setShowNotifications] = useState(false); // This is for the red dot, not the dropdown content
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false); // State for dropdown visibility
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(true); // State for theme toggle
  const [rssFeedUrl, setRssFeedUrl] = useState('https://www.theverge.com/rss/index.xml'); // Replaced with a working RSS feed for testing
  const [isRssMode, setIsRssMode] = useState(false); // New state to indicate RSS mode

  const notificationRef = useRef(null); // Ref for the notification dropdown

  // Apply theme on initial load and when darkMode changes
  useEffect(() => {
    applyTheme(darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
  // const GNEWS_API_URL = 'https://gnews.io/api/v4/search'; // Changed to GNews API URL
  const API_PROXY_URL = '/api/news'; // New proxy API endpoint

  // Initialize RSS parser
  const parser = new RSSParser();

  // Effect to handle clicks outside the notification dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationRef]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!NEWS_API_KEY || NEWS_API_KEY === 'YOUR_NEWS_API_KEY' || NEWS_API_KEY.length < 10) { // Added a basic length check
        console.error("NEWS_API_KEY is missing or invalid:", NEWS_API_KEY ? `${NEWS_API_KEY.substring(0, 5)}...${NEWS_API_KEY.substring(NEWS_API_KEY.length - 5)}` : 'Not set');
        throw new Error("News API key not configured or invalid. Please set VITE_NEWS_API_KEY in your .env file and ensure it's a valid key.");
      }

      const categoryQuery = categories.find(cat => cat.id === selectedCategory)?.query || 'AI';
      const query = searchQuery || categoryQuery;
      // Call the new proxy API route
      const proxyApiUrl = `${API_PROXY_URL}?q=${query}&lang=en&max=100`;
      console.log("Fetching from Proxy API URL:", proxyApiUrl); // Log the full proxy API URL
      // The API key is now handled by the serverless function, no need to send it from the client
      const response = await fetch(proxyApiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const fetchedArticles = data.articles
        .map((article, index) => ({
          id: `${article.url}-${index}`, // Use article.url for ID as source.id is not available in GNews
          title: article.title,
          summary: article.description,
          source: article.source.name,
          date: article.publishedAt,
          category: categoryQuery, // Assign category based on the current filter
          image: article.image, // Changed from article.urlToImage to article.image
          url: article.url,
          trending: Math.random() > 0.7, // Simulate trending
          saved: savedArticles.has(`${article.url}-${index}`), // Update savedArticles check
          language: "en"
        }));
      
      setArticles(fetchedArticles);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch news:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [NEWS_API_KEY, searchQuery, selectedCategory, savedArticles]);

  // Effect to filter articles based on search query
  useEffect(() => {
    console.log("Filtering articles. Total articles:", articles.length);
    const currentCategoryQuery = categories.find(cat => cat.id === selectedCategory)?.query || 'AI';
    const queryToFilter = searchQuery || currentCategoryQuery;
    console.log("Current category query:", currentCategoryQuery);
    console.log("Query to filter:", queryToFilter);

    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(queryToFilter.toLowerCase()) ||
      (article.summary && article.summary.toLowerCase().includes(queryToFilter.toLowerCase()))
    );
    console.log("Filtered articles count:", filtered.length);
    setFilteredArticles(filtered);
  }, [articles, searchQuery, selectedCategory]);

  const fetchRssFeed = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching RSS feed from:", url);
      // Using a proxy to bypass CORS issues in development. In production, you'd need a proper CORS setup.
      // const CORS_PROXY = 'https://corsproxy.io/?'; // A simple public CORS proxy
      const CORS_PROXY = 'https://api.allorigins.win/get?url='; // Another public CORS proxy
      const feed = await parser.parseURL(CORS_PROXY + encodeURIComponent(url)); // Encode the URL for allorigins.win
      console.log("Parsed RSS feed:", feed);

      const fetchedArticles = feed.items.map((item, index) => ({
        id: `${item.guid || item.link}-${index}`,
        title: item.title,
        summary: item.contentSnippet || item.summary || item.content || 'No summary available.',
        source: feed.title || 'RSS Feed',
        date: item.pubDate,
        category: 'RSS Feeds',
        image: item.enclosure && item.enclosure.url ? item.enclosure.url : 'https://via.placeholder.com/400x200?text=No+Image', // Placeholder if no image
        url: item.link,
        trending: false, // RSS feeds don't typically have a trending indicator
        saved: savedArticles.has(`${item.guid || item.link}-${index}`),
        language: item.language || "en"
      }));
      console.log("Formatted RSS articles:", fetchedArticles);

      setArticles(fetchedArticles);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch RSS feed:", e);
      setError(`Failed to fetch RSS feed: ${e.message}. Make sure the URL is valid and accessible.`);
    } finally {
      setLoading(false);
    }
  }, [savedArticles]);

  useEffect(() => {
    if (selectedCategory === 'rss') {
      setIsRssMode(true);
      setArticles([]); // Clear articles when switching to RSS mode
      setSearchQuery(''); // Clear search query
      if (rssFeedUrl) { // Automatically fetch if URL is present
        fetchRssFeed(rssFeedUrl);
      }
    } else {
      setIsRssMode(false);
      fetchNews(); // Fetch news if not in RSS mode
      const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [selectedCategory, fetchNews, fetchRssFeed]); // Removed rssFeedUrl from dependency array

  // This useEffect is for the initial fetch and subsequent refreshes for News API
  useEffect(() => {
    if (!isRssMode) {
      fetchNews();
      const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [fetchNews, isRssMode]);


  const trendingTopics = [
    "AI Ethics", "Machine Learning", "Deep Learning", "Neural Networks", "Robotics"
  ];

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // In a real app, this would fetch new articles
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);


  const toggleSaveArticle = (id) => {
    const newSaved = new Set(savedArticles);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedArticles(newSaved);
    
    // Update articles array to reflect saved status
    setArticles(prev => prev.map(article => 
      article.id === id ? { ...article, saved: newSaved.has(id) } : article
    ));
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'AI Research': 'bg-[#6b46c1] text-white', // Deep purple from image
      'AI Startups': 'bg-[#d53f8c] text-white', // Pink from image
      'AI Policy & Ethics': 'bg-[#38a169] text-white', // Green from image
      'AI Tools & Applications': 'bg-[#d69e2e] text-white', // Yellow/Orange from image
      'AI Business News': 'bg-[#e53e3e] text-white' // Red from image
    };
    return colors[category] || 'bg-gray-500 text-white';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-light transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-700 bg-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-primary-blue to-accent-purple p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">AI News Aggregator</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search AI news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-600 bg-dark-bg text-text-light focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-dark-bg text-text-light hover:bg-gray-700 transition-colors"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <div className="relative" ref={notificationRef}> {/* Attach ref here */}
                <button
                  onClick={() => setShowNotificationDropdown(prev => !prev)}
                  className="p-2 rounded-lg bg-dark-bg text-text-light relative hover:bg-gray-700 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {showNotifications && ( // Keep the red dot for now, can be tied to actual unread notifications later
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-accent-red rounded-full"></span>
                  )}
                </button>
                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-dark-card rounded-lg shadow-lg py-2 z-50 border border-gray-700">
                    <div className="px-4 py-2 text-sm font-semibold text-text-light border-b border-gray-700">Notifications</div>
                    <div className="p-2">
                      <div
                        className="flex items-start space-x-3 p-2 hover:bg-gray-700 rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedCategory('research');
                          setShowNotificationDropdown(false);
                        }}
                      >
                        <Bell className="h-4 w-4 text-primary-blue mt-1" />
                        <div>
                          <p className="text-sm text-text-light">New articles available in AI Research!</p>
                          <span className="text-xs text-text-muted">5 minutes ago</span>
                        </div>
                      </div>
                      <div
                        className="flex items-start space-x-3 p-2 hover:bg-gray-700 rounded-md cursor-pointer"
                        onClick={() => {
                          setSearchQuery('AI Ethics');
                          setShowNotificationDropdown(false);
                        }}
                      >
                        <TrendingUp className="h-4 w-4 text-accent-red mt-1" />
                        <div>
                          <p className="text-sm text-text-light">AI Ethics is trending today.</p>
                          <span className="text-xs text-text-muted">1 hour ago</span>
                        </div>
                      </div>
                      <div className="text-center p-2 border-t border-gray-700 mt-2">
                        <a href="#" className="text-primary-blue text-sm hover:underline">View all notifications</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="mb-8 p-4 rounded-lg bg-dark-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-primary-blue" />
                <span className="text-sm text-text-muted">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-accent-purple" /> {/* Changed icon for sources */}
                <span className="text-sm text-text-muted">Sources: 8+</span> {/* Added Sources */}
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-accent-cyan" /> {/* Changed icon for articles */}
                <span className="text-sm text-text-muted">Articles: {articles.length}</span>
              </div>
            </div>
            
            <button className="px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 bg-primary-blue hover:bg-blue-700 text-white">
              <TrendingUp className="h-4 w-4" />
              <span>Get Daily Digest</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            {/* Categories */}
            <div className="mb-6 p-4 rounded-lg bg-dark-card shadow">
              <h3 className="font-semibold mb-3 flex items-center text-text-light">
                <Zap className="h-4 w-4 mr-2 text-primary-blue" />
                Categories
              </h3>
              <nav className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary-blue text-white' 
                          : 'hover:bg-gray-700 text-text-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Trending Topics */}
            <div className="p-4 rounded-lg bg-dark-card shadow">
              <h3 className="font-semibold mb-3 flex items-center text-text-light">
                <TrendingUp className="h-4 w-4 mr-2 text-accent-red" />
                Trending Topics
              </h3>
              <div className="space-y-2">
                {trendingTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">
                      {topic}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-dark-bg text-text-muted">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {isRssMode && (
              <div className="mb-8 p-4 rounded-lg bg-dark-card shadow flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="text"
                  placeholder="Enter RSS Feed URL (e.g., https://www.theverge.com/rss/index.xml)"
                  value={rssFeedUrl}
                  onChange={(e) => setRssFeedUrl(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-dark-bg text-text-light focus:outline-none focus:ring-2 focus:ring-primary-blue w-full sm:w-auto"
                />
                <button
                  onClick={() => {
                    console.log("Fetch RSS Feed button clicked!");
                    fetchRssFeed(rssFeedUrl);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 bg-primary-blue hover:bg-blue-700 text-white w-full sm:w-auto justify-center"
                  disabled={!rssFeedUrl || loading}
                >
                  <Rss className="h-4 w-4" />
                  <span>Fetch RSS Feed</span>
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 rounded-lg bg-dark-card shadow">
                <Brain className="h-12 w-12 mx-auto text-primary-blue animate-pulse mb-4" />
                <h3 className="text-lg font-medium mb-2 text-text-light">
                  {isRssMode ? 'Fetching RSS feed...' : 'Fetching the latest AI news...'}
                </h3>
                <p className="text-text-muted">
                  This might take a moment.
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12 rounded-lg bg-red-900 text-red-100 shadow">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="lg:font-medium mb-2">Error fetching news:</h3>
                <p className="mb-4">{error}</p>
                <p className="text-sm">Please check your API key and network connection, or the RSS feed URL.</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12 rounded-lg bg-dark-card shadow">
                <Brain className="h-12 w-12 mx-auto text-text-muted mb-4" />
                <h3 className="lg:font-medium mb-2 text-text-light">No articles found</h3>
                <p className="text-text-muted">
                  Try adjusting your search or category filter, or enter an RSS feed URL.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4 h-auto min-h-[500px]">
                {filteredArticles.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 bg-dark-card"
                  >
                    <div className="relative">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-48 object-cover"
                      />
                      {article.trending && !isRssMode && (
                        <div className="absolute top-2 right-2 bg-accent-red text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          TRENDING
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                          {article.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 text-text-light">{article.title}</h3>
                      <p className="mb-3 line-clamp-3 text-text-muted">
                        {article.summary}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-primary-blue">
                            {article.source}
                          </span>
                          <span className="text-xs text-text-muted">
                            • {formatTimeAgo(article.date)}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => toggleSaveArticle(article.id)}
                          className={`p-1 rounded-full ${
                            savedArticles.has(article.id)
                              ? 'text-yellow-500'
                              : 'text-text-muted hover:text-yellow-500'
                          }`}
                        >
                          {savedArticles.has(article.id) ? (
                            <BookmarkCheck className="h-5 w-5" />
                          ) : (
                            <Bookmark className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-block text-center py-2 rounded-lg font-medium transition-colors bg-primary-blue hover:bg-blue-700 text-white"
                      >
                        Read Full Article
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
