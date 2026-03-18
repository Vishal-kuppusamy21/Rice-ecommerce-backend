const mongoose = require('mongoose');

const subcategorySchema = mongoose.Schema({
    name: { type: String, required: true },
    name_ta: { type: String }, // Tamil name
    image: { type: String },
});

const categorySchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        name_ta: { type: String }, // Tamil name
        description: { type: String },
        description_ta: { type: String }, // Tamil description
        image: { type: String },
        subcategories: [subcategorySchema],
    },
    {
        timestamps: true,
    }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
