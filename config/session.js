const MongoStore = require('connect-mongo');

const createSessionStore = () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // Create a new MongoStore instance directly
  return new MongoStore({
    mongoUrl: mongoUri,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  });
};

module.exports = createSessionStore; 