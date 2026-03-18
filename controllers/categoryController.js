const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    const categories = await Category.find({});
    res.json(categories);
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    const { name, name_ta, description, description_ta, image, subcategories } = req.body;

    // Manual validation if needed, or mongoose handles required
    const category = new Category({ name, name_ta, description, description_ta, image, subcategories });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    const { name, name_ta, description, description_ta, image, subcategories } = req.body;
    const category = await Category.findById(req.params.id);

    if (category) {
        category.name = name || category.name;
        category.name_ta = name_ta || category.name_ta;
        category.description = description || category.description;
        category.description_ta = description_ta || category.description_ta;
        category.image = image || category.image;

        // Handle subcategories carefully. 
        // If passed, verify they are array of objects with name etc or just strings?
        // Schema expects: subcategories: [{ name: String, ... }]
        if (subcategories) {
            category.subcategories = subcategories;
        }

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } else {
        res.status(404).json({ message: 'Category not found' });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        await category.deleteOne();
        res.json({ message: 'Category removed' });
    } else {
        res.status(404).json({ message: 'Category not found' });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
