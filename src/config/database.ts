import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(uri: string = env.mongoUri): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(uri, {
    autoIndex: true,
  });

  console.info('[database] MongoDB connected');
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.info('[database] MongoDB disconnected');
}
