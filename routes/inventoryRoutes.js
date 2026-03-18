const express = require('express');
const router = express.Router();
const { updateStock, getInventoryProducts, getInventoryStats, getStockHistory } = require('../controllers/inventoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/stock-entry', protect, admin, updateStock);
router.get('/stats', protect, admin, getInventoryStats);
router.get('/history', protect, admin, getStockHistory);

module.exports = router;
