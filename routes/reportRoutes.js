const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesReport,
    getMonthlyReport,
    getProductPerformanceReport,
    getUserPurchaseReport
} = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/sales', protect, admin, getSalesReport);
router.get('/monthly', protect, admin, getMonthlyReport);
router.get('/products', protect, admin, getProductPerformanceReport);
router.get('/users', protect, admin, getUserPurchaseReport);

module.exports = router;
