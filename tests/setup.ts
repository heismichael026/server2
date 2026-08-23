import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

export = async function globalSetup() {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
    },
  });
  process.env.MONGODB_URI = mongoServer.getUri();
  (global as Record<string, unknown>).__MONGO_URI = mongoServer.getUri();
  (global as Record<string, unknown>).__MONGOD = mongoServer;

  await mongoose.connect(mongoServer.getUri());
};
