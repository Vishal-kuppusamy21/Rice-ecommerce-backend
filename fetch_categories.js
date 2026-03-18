const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');
const connectDB = require('./config/db');

dotenv.config();

const fetchCats = async () => {
    try {
        await connectDB();
        const cats = await Category.find({});
        console.log(JSON.stringify(cats, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fetchCats();
