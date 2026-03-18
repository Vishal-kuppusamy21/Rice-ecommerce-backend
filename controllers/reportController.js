const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const orders = await Order.find({ isPaid: true });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);

    const pendingOrders = await Order.countDocuments({ status: 'Pending' });

    // Find products where real quantity (sum of bag sizes) < lowStockThreshold
    const allProducts = await Product.find({});
    const lowStockItems = allProducts.filter(p => {
        let realStock = p.quantity || 0;
        if (p.availableWeights && p.availableWeights.length > 0) {
            realStock = p.availableWeights.reduce((sum, w) => sum + (w.stock || 0), 0);
        }
        return realStock < (p.lowStockThreshold || 10);
    });
    const lowStockProductsCount = lowStockItems.length;

    res.json({
        totalOrders,
        totalUsers,
        totalProducts,
        totalSales,
        pendingOrders,
        lowStockProducts: lowStockProductsCount,
        lowStockItems: lowStockItems.slice(0, 5),
    });
};

// @desc    Get sales report (Daily)
// @route   GET /api/reports/sales
// @access  Private/Admin
const getSalesReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    let matchStage = { isPaid: true };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
            matchStage.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            // Set to end of day if only date string is provided
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.createdAt.$lte = end;
        }
    } else {
        const date = new Date();
        const last30Days = new Date(date.setDate(date.getDate() - 30));
        matchStage.createdAt = { $gte: last30Days };
    }

    const sales = await Order.aggregate([
        {
            $match: matchStage
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalSales: { $sum: "$totalPrice" },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json(sales);
};

// @desc    Get monthly transactions
// @route   GET /api/reports/monthly
// @access  Private/Admin
const getMonthlyReport = async (req, res) => {
    const monthlySales = await Order.aggregate([
        {
            $match: { isPaid: true }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                totalSales: { $sum: "$totalPrice" },
                totalOrders: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json(monthlySales);
};

// @desc    Get product performance report
// @route   GET /api/reports/products
// @access  Private/Admin
const getProductPerformanceReport = async (req, res) => {
    const productStats = await Order.aggregate([
        { $match: { isPaid: true } },
        { $unwind: "$orderItems" },
        {
            $group: {
                _id: "$orderItems.product",
                productName: { $first: "$orderItems.name" },
                totalQuantitySold: { $sum: "$orderItems.qty" },
                totalRevenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
            }
        },
        { $sort: { totalQuantitySold: -1 } }
    ]);

    res.json(productStats);
};

// @desc    Get user purchase details
// @route   GET /api/reports/users
// @access  Private/Admin
const getUserPurchaseReport = async (req, res) => {
    const userStats = await Order.aggregate([
        { $match: { isPaid: true } },
        {
            $group: {
                _id: "$user",
                totalSpent: { $sum: "$totalPrice" },
                orderCount: { $sum: 1 },
                lastOrderDate: { $max: "$createdAt" }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {
            $project: {
                _id: 1,
                totalSpent: 1,
                orderCount: 1,
                lastOrderDate: 1,
                user: { $arrayElemAt: ["$userDetails", 0] }
            }
        },
        {
            $project: {
                "user.password": 0, // Exclude sensitive info
                "user.__v": 0
            }
        },
        { $sort: { totalSpent: -1 } }
    ]);

    res.json(userStats);
};

module.exports = {
    getDashboardStats,
    getSalesReport,
    getMonthlyReport,
    getProductPerformanceReport,
    getUserPurchaseReport
};
