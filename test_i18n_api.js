const axios = require('axios');
const fs = require('fs');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/products');
        const products = response.data.products;

        console.log(`Fetched ${products.length} products`);

        if (products.length > 0) {
            const firstProduct = products[0];
            fs.writeFileSync('products_output.json', JSON.stringify(firstProduct, null, 2), 'utf8');
            console.log('Written to products_output.json');

            // Fetch category details directly to check if fields exist in DB
            if (firstProduct.category && firstProduct.category._id) {
                // Assuming there is an endpoint for single category or just fetch all categories
                // Let's try fetching all categories as I saw getCategories implementation
                const catResponse = await axios.get('http://localhost:5000/api/categories');
                const categories = catResponse.data;
                const matchedCat = categories.find(c => c._id === firstProduct.category._id);
                if (matchedCat) {
                    fs.writeFileSync('category_output.json', JSON.stringify(matchedCat, null, 2), 'utf8');
                    console.log('Written to category_output.json');
                }
            }
        }
    } catch (error) {
        console.error('Error fetching products:', error.message);
    }
}

testApi();
