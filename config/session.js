const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const createSessionStore = () => {
  // Use the existing mongoose connection
  return MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  });
};

module.exports = createSessionStore; 