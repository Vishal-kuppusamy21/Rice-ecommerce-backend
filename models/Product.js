const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const productSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Admin who added it
        },
        name: { type: String, required: true },
        name_ta: { type: String }, // Tamil name
        image: { type: String, required: true },
        description: { type: String, required: true },
        description_ta: { type: String }, // Tamil description
        category: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Category',
        },
        subcategory: { type: String }, // Storing name or ID
        quantity: { type: Number, required: true, default: 0 }, // Inventory
        unit: { type: String, default: 'kg' },
        discount: { type: Number, required: false, default: 0 }, // Percentage discount
        rating: { type: Number, required: true, default: 0 },
        numReviews: { type: Number, required: true, default: 0 },
        reviews: [reviewSchema],
        availableWeights: [
            {
                weight: { type: String, required: true },
                price: { type: Number, required: true },
                stock: { type: Number, default: 0 }
            }
        ],
        isAvailable: { type: Boolean, required: true, default: true },
        lowStockThreshold: { type: Number, default: 10 },
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
