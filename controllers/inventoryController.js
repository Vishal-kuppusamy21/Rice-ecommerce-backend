const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');
const sendEmail = require('../utils/sendEmail');

// Helper: compute real stock from weight-level data
const getRealStock = (product) => {
    if (product.availableWeights && product.availableWeights.length > 0) {
        return product.availableWeights.reduce((sum, w) => sum + (w.stock || 0), 0);
    }
    return product.quantity || 0;
};

// Helper: send low stock alert email
const sendLowStockAlert = async (product, bagSize, currentStock) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (!adminEmail) return;

        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #D97706;">⚠️ Low Stock Alert</h2>
                <p>The following product is running low on stock:</p>
                <table style="width:100%; border-collapse: collapse;">
                    <tr style="background: #fef3c7;">
                        <td style="padding: 10px; border: 1px solid #fbbf24;"><strong>Product</strong></td>
                        <td style="padding: 10px; border: 1px solid #fbbf24;">${product.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Bag Size</strong></td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${bagSize}</td>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <td style="padding: 10px; border: 1px solid #fbbf24;"><strong>Current Stock</strong></td>
                        <td style="padding: 10px; border: 1px solid #fbbf24; color: #dc2626; font-weight: bold;">${currentStock} Bags</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Threshold</strong></td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${product.lowStockThreshold || 10} Bags</td>
                    </tr>
                </table>
                <p style="margin-top: 20px;">Please restock this item soon.</p>
                <p>Best Regards,<br>Shree Kumaravel Rice System</p>
            </div>
        `;

        await sendEmail({
            email: adminEmail,
            subject: `⚠️ Low Stock Alert: ${product.name} (${bagSize})`,
            message
        });
        console.log(`Low stock alert sent for ${product.name} (${bagSize})`);
    } catch (err) {
        console.error('Failed to send low stock alert:', err.message);
    }
};

// @desc    Update product stock levels directly
// @route   POST /api/inventory/stock-entry
// @access  Private/Admin
const updateStock = async (req, res) => {
    try {
        const { productId, bagSize, quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        const weightIndex = product.availableWeights.findIndex(w => w.weight === bagSize);
        if (weightIndex === -1) {
            res.status(400).json({ message: `Bag size ${bagSize} not found for this product` });
            return;
        }

        const previousStock = product.availableWeights[weightIndex].stock || 0;
        const change = Number(quantity);
        const newWeightStock = previousStock + change;

        // Prevent stock from going negative
        if (newWeightStock < 0) {
            res.status(400).json({ message: 'Cannot reduce stock below 0' });
            return;
        }

        product.availableWeights[weightIndex].stock = newWeightStock;

        // Recalculate total quantity
        product.quantity = product.availableWeights.reduce((sum, w) => sum + (w.stock || 0), 0);

        // Feature 7: Auto-disable if out of stock, auto-enable if restocked
        const realStock = getRealStock(product);
        if (realStock === 0) {
            product.isAvailable = false;
        } else if (!product.isAvailable && realStock > 0) {
            product.isAvailable = true;
        }

        await product.save();

        // Feature 1 & 4: Save stock history entry
        await StockHistory.create({
            productId: product._id,
            productName: product.name,
            bagSize,
            quantityChange: change,
            newStock: newWeightStock,
            reason: change > 0 ? 'Restock' : 'Manual Adjustment',
            performedBy: req.user ? req.user.firstName + ' ' + req.user.lastName : 'Admin'
        });

        // Feature 2: Low stock email alert
        if (newWeightStock > 0 && newWeightStock < (product.lowStockThreshold || 10)) {
            await sendLowStockAlert(product, bagSize, newWeightStock);
        }

        res.json({ message: 'Stock updated successfully', product });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Get all products with stock
// @route   GET /api/inventory/products
// @access  Private/Admin
const getInventoryProducts = async (req, res) => {
    try {
        const products = await Product.find({}).select('name availableWeights quantity');
        res.json(products);
    } catch (error) {
        console.error('Error fetching inventory products:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get inventory summary stats
// @route   GET /api/inventory/stats
// @access  Private/Admin
const getInventoryStats = async (req, res) => {
    try {
        const products = await Product.find({});

        const totalProducts = products.length;
        const totalStockBags = products.reduce((sum, p) => sum + getRealStock(p), 0);
        const lowStockProducts = products.filter(p => getRealStock(p) < (p.lowStockThreshold || 10)).length;

        res.json({ totalProducts, totalStockBags, inventoryValue: 0, lowStockProducts });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get stock history
// @route   GET /api/inventory/history
// @access  Private/Admin
const getStockHistory = async (req, res) => {
    try {
        const history = await StockHistory.find({})
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(history);
    } catch (error) {
        console.error('Error fetching stock history:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { updateStock, getInventoryProducts, getInventoryStats, getStockHistory };
