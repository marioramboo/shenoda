import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Church Service Management API listening on http://localhost:${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🩺 Healthcheck: http://localhost:${env.PORT}/health`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Stopping server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
