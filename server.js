const express = require('express');
const path = require('path');

const ProductManager = require('./src/ProductManager');
const PriceHistory = require('./src/PriceHistory');
const SearchService = require('./src/SearchService');

const settings = require('./config/settings.json');

const app = express();
const productManager = new ProductManager('./config/products.json');
const priceHistory = new PriceHistory(settings.database.path);
const searchService = new SearchService();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());

app.get('/', async (req, res) => {
  const products = productManager.getAll();
  const stats = priceHistory.getAllStats();
  
  const enrichedProducts = products.map(p => {
    const stat = stats.find(s => s.product_id === p.id);
    return {
      ...p,
      currentPrice: stat?.current_price,
      lowestPrice: stat?.lowest_price,
      highestPrice: stat?.highest_price,
      lastChecked: stat?.last_checked,
      totalChecks: stat?.total_checks,
    };
  });

  res.render('index', { products: enrichedProducts });
});

app.get('/api/products', (req, res) => {
  const products = productManager.getAll();
  const stats = priceHistory.getAllStats();
  
  const enriched = products.map(p => {
    const stat = stats.find(s => s.product_id === p.id);
    return {
      ...p,
      currentPrice: stat?.current_price,
      lowestPrice: stat?.lowest_price,
      highestPrice: stat?.highest_price,
      lastChecked: stat?.last_checked,
    };
  });
  
  res.json(enriched);
});

app.get('/api/products/:id/history', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const history = priceHistory.getRange(req.params.id, days);
  res.json(history);
});

app.post('/api/products', (req, res) => {
  try {
    const product = productManager.add(req.body);
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const product = productManager.update(req.params.id, req.body);
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    productManager.remove(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/products/:id/toggle', (req, res) => {
  try {
    const product = productManager.getById(req.params.id);
    const updated = product.enabled 
      ? productManager.disable(req.params.id)
      : productManager.enable(req.params.id);
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/search', (req, res) => {
  res.render('search', { results: null, query: '' });
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }
  
  try {
    const results = await searchService.searchAll(query);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }
  
  try {
    const results = await searchService.searchAll(query);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = settings.dashboard?.port || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Dashboard running at http://localhost:${PORT}`);
});
