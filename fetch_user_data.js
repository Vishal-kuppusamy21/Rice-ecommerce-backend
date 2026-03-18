const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const fs = require('fs');

const fetchData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const count = await User.countDocuments();
        const users = await User.find({}, 'email password');

        const result = {
            totalUsers: count,
            userDetails: users.map(user => ({
                email: user.email,
                passwordHash: user.password
            }))
        };

        fs.writeFileSync(path.join(__dirname, 'user_results.json'), JSON.stringify(result, null, 2));
        console.log('Data written to user_results.json');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

fetchData();
