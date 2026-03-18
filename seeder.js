const mongoose = require('mongoose');
const dotenv = require('dotenv');
// const users = require('./data/users');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Order = require('./models/Order');
// const Supplier = require('./models/Supplier');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Category.deleteMany();
        // await Supplier.deleteMany();

        // Create Admin User
        const adminUser = await User.create({
            firstName: 'Shree',
            lastName: 'Kumaravel',
            email: 'info.shreekumaravel@gmail.com',
            password: 'password', // will be hashed by pre-save
            role: 'admin',
            phoneNumber: '9443281822'
        });

        // Create Normal User
        const user = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'user@example.com',
            password: 'password',
            role: 'user',
            phoneNumber: '0987654321'
        });

        // Create Default Supplier removed for own-manufacturing model

        // Create Categories
        const categoriesData = [
            {
                name: 'Rice',
                name_ta: 'அரிசி',
                description: 'Premium quality rice varieties',
                description_ta: 'உயர்தர அரிசி வகைகள்',
                image: '/rice-category.jpg',
                subcategories: [
                    { name: 'Basmati Rice', name_ta: 'பாஸ்மதி அரிசி' },
                    { name: 'Ponni Rice', name_ta: 'பொன்னி அரிசி' },
                    { name: 'Sona Masoori', name_ta: 'சோனா மசூரி' },
                    { name: 'Brown Rice', name_ta: 'பழுப்பு அரிசி' },
                    { name: 'Red Rice', name_ta: 'சிவப்பு அரிசி' },
                    { name: 'Seeraga Samba', name_ta: 'சீரக சம்பா' },
                    { name: 'Jasmine Rice', name_ta: 'ஜாஸ்மின் அரிசி' },
                    { name: 'Idli Rice', name_ta: 'இட்லி அரிசி' },
                    { name: 'Silk Ponni', name_ta: 'சில்க் பொன்னி' },
                    { name: 'Jeerakasala', name_ta: 'ஜீரகசாலா' },
                    { name: 'Black Rice', name_ta: 'கருப்பு கவுனி' },
                    { name: 'Mapillai Samba', name_ta: 'மாப்பிள்ளை சம்பா' },
                ],
            }
        ];

        const createdCategories = await Category.insertMany(categoriesData);

        // Helper to find category ID
        const getCatId = (name) => createdCategories.find(c => c.name === name)._id;

        // Create Products
        const products = [
            {
                name: 'Premium Basmati Rice',
                name_ta: 'பிரீமியம் பாஸ்மதி அரிசி',
                description: 'Long rice aromatic basmati rice, perfect for biryani and pulao. Aged for 2 years for best taste.',
                description_ta: 'நீண்ட தானிய நறுமணமுள்ள பாஸ்மதி அரிசி, பிரியாணி மற்றும் புலாவிற்கு ஏற்றது. சிறந்த சுவைக்காக 2 ஆண்டுகள் பழமையானது.',
                price: 180,
                quantity: 100,
                category: getCatId('Rice'),
                subcategory: 'Basmati Rice',
                image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
                unit: 'kg',
                rating: 4.5,
                numReviews: 128,
                availableWeights: [
                    { weight: '1kg', price: 180 },
                    { weight: '5kg', price: 850 },
                    { weight: '10kg', price: 1650 }
                ]
            },
            {
                name: 'Organic Ponni Rice',
                name_ta: 'இயற்கை பொன்னி அரிசி',
                description: 'Traditional South Indian rice variety, soft and fluffy when cooked. Ideal for daily meals.',
                description_ta: 'பாரம்பரிய தென்னிந்திய அரிசி வகை, சமைக்கும் போது மென்மையாகவும் பஞ்சுபோன்றதாகவும் இருக்கும். தினசரி உணவுக்கு ஏற்றது.',
                price: 85,
                quantity: 150,
                category: getCatId('Rice'),
                subcategory: 'Ponni Rice',
                image: 'https://images.unsplash.com/photo-1596541223130-5d3155429077?w=500&q=80',
                unit: 'kg',
                rating: 4.3,
                numReviews: 95,
                availableWeights: [
                    { weight: '5kg', price: 420 },
                    { weight: '10kg', price: 820 },
                    { weight: '26kg', price: 2100 }
                ]
            },
            {
                name: 'Sona Masoori Rice',
                name_ta: 'சோனா மசூரி அரிசி',
                description: 'Lightweight and aromatic rice, low in starch content. Perfect for everyday cooking.',
                description_ta: 'குறைந்த மாவுச்சத்து கொண்ட இலகுரக மற்றும் நறுமணமுள்ள அரிசி. அன்றாட சமையலுக்கு ஏற்றது.',
                price: 75,
                quantity: 200,
                category: getCatId('Rice'),
                subcategory: 'Sona Masoori',
                image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80',
                unit: 'kg',
                rating: 4.4,
                numReviews: 156,
                availableWeights: [
                    { weight: '5kg', price: 370 },
                    { weight: '10kg', price: 720 },
                    { weight: '26kg', price: 1850 }
                ]
            },
            {
                name: 'Seeraga Samba Rice',
                name_ta: 'சீரக சம்பா அரிசி',
                description: 'Finest traditional South Indian rice, known for its distinct aroma and small rice. Essential for authentic Dindigul biryani.',
                description_ta: 'தனித்துவமான நறுமணம் மற்றும் சிறிய தானியங்களுக்கு பெயர் பெற்ற மிகச்சிறந்த பாரம்பரிய தென்னிந்திய அரிசி.',
                price: 110,
                quantity: 80,
                category: getCatId('Rice'),
                subcategory: 'Seeraga Samba',
                image: 'https://images.unsplash.com/photo-1596541223130-5d3155429077?w=500&q=80',
                unit: 'kg',
                rating: 4.8,
                numReviews: 210,
                availableWeights: [
                    { weight: '1kg', price: 110 },
                    { weight: '5kg', price: 540 },
                    { weight: '10kg', price: 1050 }
                ]
            },
            {
                name: 'Whole Brown Rice',
                name_ta: 'முழு தானிய பழுப்பு அரிசி',
                description: 'Nutrient-rich unpolished rice with bran layer intact. High in fiber and minerals.',
                description_ta: 'தவிடு அடுக்குடன் கூடிய சத்து நிறைந்த தீட்டப்படாத அரிசி. நார்ச்சத்து மற்றும் தாதுக்கள் அதிகம்.',
                price: 95,
                quantity: 120,
                category: getCatId('Rice'),
                subcategory: 'Brown Rice',
                image: 'https://images.unsplash.com/photo-1596541223130-5d3155429077?w=500&q=80',
                unit: 'kg',
                rating: 4.2,
                numReviews: 85,
                availableWeights: [
                    { weight: '1kg', price: 95 },
                    { weight: '5kg', price: 460 },
                    { weight: '10kg', price: 900 }
                ]
            },
            {
                name: 'Red Matta Rice',
                name_ta: 'மட்ட அரிசி',
                description: 'Traditional parboiled rice with earthy flavor and nutrient-rich red bran. Very healthy and filling.',
                description_ta: 'மண்ணின் சுவை மற்றும் சத்து நிறைந்த சிவப்பு தவிடு கொண்ட பாரம்பரிய புழுங்கல் அரிசி.',
                price: 88,
                quantity: 90,
                category: getCatId('Rice'),
                subcategory: 'Red Rice',
                image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
                unit: 'kg',
                rating: 4.1,
                numReviews: 64,
                availableWeights: [
                    { weight: '5kg', price: 430 },
                    { weight: '10kg', price: 850 }
                ]
            },
            {
                name: 'Salem Idli Rice',
                name_ta: 'சேலம் இட்லி அரிசி',
                description: 'Short rice parboiled rice specifically processed for making soft, fluffy idlis and crispy dosas.',
                description_ta: 'மென்மையான இட்லி மற்றும் மொறுமொறுப்பான தோசை செய்ய உதவும் சிறிய தானிய புழுங்கல் அரிசி.',
                price: 65,
                quantity: 300,
                category: getCatId('Rice'),
                subcategory: 'Idli Rice',
                image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
                unit: 'kg',
                rating: 4.6,
                numReviews: 180,
                availableWeights: [
                    { weight: '5kg', price: 320 },
                    { weight: '10kg', price: 630 },
                    { weight: '26kg', price: 1600 }
                ]
            },
            {
                name: 'Premium Silk Ponni Rice',
                name_ta: 'சில்க் பொன்னி அரிசி',
                description: 'Super fine quality ponni rice, aged and processed to give a silky texture and great taste.',
                description_ta: 'பட்டு போன்ற அமைப்பு மற்றும் சிறந்த சுவை கொண்ட தரமான பொன்னி அரிசி.',
                price: 92,
                quantity: 250,
                category: getCatId('Rice'),
                subcategory: 'Silk Ponni',
                image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80',
                unit: 'kg',
                rating: 4.7,
                numReviews: 140,
                availableWeights: [
                    { weight: '5kg', price: 450 },
                    { weight: '10kg', price: 880 },
                    { weight: '26kg', price: 2250 }
                ]
            },
            {
                name: 'Wayanad Jeerakasala Rice',
                name_ta: 'வயநாடு ஜீரகசாலா அரிசி',
                description: 'Short rice aromatic rice from Wayanad. Known for its unique flavor and used specifically for Malabar Biryani.',
                description_ta: 'வயநாட்டின் நறுமணமுள்ள சிறிய தானிய அரிசி. தனித்துவமான சுவை மற்றும் மலபார் பிரியாணிக்கு பயன்படுத்தப்படுகிறது.',
                price: 135,
                quantity: 60,
                category: getCatId('Rice'),
                subcategory: 'Jeerakasala',
                image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
                unit: 'kg',
                rating: 4.9,
                numReviews: 45,
                availableWeights: [
                    { weight: '1kg', price: 135 },
                    { weight: '5kg', price: 650 },
                    { weight: '10kg', price: 1250 }
                ]
            },
            {
                name: 'Karuppu Kavuni (Black Rice)',
                name_ta: 'கருப்பு கவுனி அரிசி',
                description: 'Forbidden rice of South India. Extremely high in antioxidants and iron. Great for sweet puddings and health mix.',
                description_ta: 'தென்னிந்தியாவின் தடைசெய்யப்பட்ட அரிசி. ஆக்ஸிஜனேற்றிகள் மற்றும் இரும்புச்சத்து அதிகம்.',
                price: 220,
                quantity: 40,
                category: getCatId('Rice'),
                subcategory: 'Black Rice',
                image: 'https://images.unsplash.com/photo-1596541223130-5d3155429077?w=500&q=80',
                unit: 'kg',
                rating: 4.8,
                numReviews: 32,
                availableWeights: [
                    { weight: '500g', price: 115 },
                    { weight: '1kg', price: 220 },
                    { weight: '5kg', price: 1050 }
                ]
            },
            {
                name: 'Mapillai Samba Rice',
                name_ta: 'மாப்பிள்ளை சம்பா அரிசி',
                description: 'Traditional red rice variety known for increasing stamina and strength. Traditionally given to bridegrooms.',
                description_ta: 'வாழ்க்கை சக்தியை அதிகரிக்கும் பாரம்பரிய சிவப்பு அரிசி வகை. மாப்பிள்ளைகளுக்கு கொடுக்கப்படுவது.',
                price: 105,
                quantity: 110,
                category: getCatId('Rice'),
                subcategory: 'Mapillai Samba',
                image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80',
                unit: 'kg',
                rating: 4.6,
                numReviews: 78,
                availableWeights: [
                    { weight: '1kg', price: 105 },
                    { weight: '5kg', price: 500 },
                    { weight: '10kg', price: 980 }
                ]
            }
        ];

        const sampleProducts = products.map((product) => {
            return { ...product, user: adminUser._id };
        });

        const createdProducts = await Product.insertMany(sampleProducts);

        // No mock orders as per request
        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    // ...
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
