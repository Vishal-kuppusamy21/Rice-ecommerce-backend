const MongoStore = require('connect-mongo');
console.log('MongoStore:', MongoStore);
console.log('Type:', typeof MongoStore);
console.log('Create:', MongoStore.create);
if (MongoStore.default) {
    console.log('Default:', MongoStore.default);
    console.log('Default Create:', MongoStore.default.create);
}
