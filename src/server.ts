import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.info(`[server] Running on port ${env.port} in ${env.nodeEnv} mode`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.info(`[server] ${signal} received, shutting down...`);
      server.close(async () => {
        const { disconnectDatabase } = await import('./config/database');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('[server] Unhandled Rejection:', reason);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
