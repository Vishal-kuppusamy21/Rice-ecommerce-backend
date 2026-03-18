const axios = require('axios');

async function checkImages() {
    try {
        const res = await axios.get('http://localhost:5000/api/products');
        const products = res.data.products;
        console.log('Product Images:');
        products.forEach(p => {
            console.log(`Name: ${p.name}, Image: ${p.image}`);
        });
    } catch (err) {
        console.error(err.message);
    }
}

checkImages();
