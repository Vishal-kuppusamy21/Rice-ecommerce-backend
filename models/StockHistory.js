const mongoose = require('mongoose');

const stockHistorySchema = mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        bagSize: { type: String, required: true },
        quantityChange: { type: Number, required: true }, // positive = added, negative = removed
        newStock: { type: Number, required: true },
        reason: {
            type: String,
            enum: ['Restock', 'Manual Adjustment', 'Order Placed', 'Order Cancelled'],
            default: 'Restock'
        },
        performedBy: { type: String, default: 'Admin' },
    },
    { timestamps: true }
);

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
module.exports = StockHistory;
