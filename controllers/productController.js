const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    const pageSize = 12; // Match frontend items per page
    const page = Number(req.query.pageNumber) || 1;

    // Search
    const keyword = req.query.keyword
        ? {
            name: {
                $regex: req.query.keyword,
                $options: 'i',
            },
        }
        : {};

    // Filters
    const categoryMatch = req.query.category ? { category: req.query.category } : {};
    const subcategoryMatch = req.query.subcategory ? { subcategory: req.query.subcategory } : {};

    // Price Filter
    const priceMatch = {};
    if (req.query.minPrice || req.query.maxPrice) {
        priceMatch['availableWeights.price'] = {};
        if (req.query.minPrice) priceMatch['availableWeights.price'].$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) priceMatch['availableWeights.price'].$lte = Number(req.query.maxPrice);
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort) {
        switch (req.query.sort) {
            case 'price-asc':
                // Note: Sorting by min price in array is complex in MongoDB without aggregation.
                // For now we keep the same logic if price was still there, 
                // but since it's removed, we'll need to use aggregation or a computed field.
                // As a fallback, we sort by current top-level price if we decided to keep it as a 'minPrice' cache.
                // But since we removed it, let's use availableWeights.0.price as a heuristic or stick to default for now.
                sort = { 'availableWeights.0.price': 1 };
                break;
            case 'price-desc':
                sort = { 'availableWeights.0.price': -1 };
                break;
            case 'name-asc':
                sort = { name: 1 };
                break;
            case 'name-desc':
                sort = { name: -1 };
                break;
            case 'newest':
            default:
                sort = { createdAt: -1 };
        }
    }

    const count = await Product.countDocuments({ ...keyword, ...categoryMatch, ...subcategoryMatch, ...priceMatch });
    const products = await Product.find({ ...keyword, ...categoryMatch, ...subcategoryMatch, ...priceMatch })
        .populate('category', 'name name_ta description description_ta')
        .sort(sort)
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize) });
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category', 'name name_ta description description_ta');

    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const { name, name_ta, description, description_ta, image, category, categoryId, subcategory, subcategoryId, quantity, unit, discount, isAvailable, availableWeights } = req.body;

        const product = new Product({
            name,
            name_ta,
            user: req.user._id,
            image,
            category: category || categoryId,
            subcategory: subcategory || subcategoryId,
            quantity,
            unit,
            description,
            description_ta,
            discount,
            isAvailable,
            availableWeights: availableWeights || []
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error("Create Product Error:", error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const { name, name_ta, description, description_ta, image, category, categoryId, subcategory, subcategoryId, quantity, unit, discount, isAvailable, availableWeights } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.name_ta = name_ta || product.name_ta;
            product.description = description || product.description;
            product.description_ta = description_ta || product.description_ta;
            product.image = image || product.image;
            product.category = category || categoryId || product.category;
            product.subcategory = subcategory || subcategoryId || product.subcategory;
            product.quantity = quantity !== undefined ? quantity : product.quantity;
            product.unit = unit || product.unit;
            product.discount = discount !== undefined ? discount : product.discount;
            product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;
            product.availableWeights = availableWeights || product.availableWeights;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            res.status(400).json({ message: 'Product already reviewed' });
            return;
        }

        const review = {
            name: req.user.firstName + ' ' + req.user.lastName,
            rating: Number(rating),
            comment,
            user: req.user._id,
        };

        product.reviews.push(review);

        product.numReviews = product.reviews.length;

        product.rating =
            product.reviews.reduce((acc, item) => item.rating + acc, 0) /
            product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review added' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview
};
