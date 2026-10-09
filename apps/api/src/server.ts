import { createApp } from './app';
import { env } from './config/env';
import { runLessonPreparationReminderCheck } from './jobs/reminderCron';
import { bootstrapAdminSystem } from './services/adminBootstrap.service';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Church Service Management API listening on http://localhost:${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🩺 Healthcheck: http://localhost:${env.PORT}/health`);

  // Run admin bootstrap in background on boot
  bootstrapAdminSystem().catch((err) => {
    console.error('Failed to bootstrap admin system:', err);
  });
});

// Daily lesson preparation reminder routine (every 24 hours)
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const dailyReminderInterval = setInterval(() => {
  runLessonPreparationReminderCheck().catch((err) => {
    console.error('Error running daily lesson preparation reminders:', err);
  });
}, DAILY_INTERVAL_MS);

// Graceful shutdown
const shutdown = () => {
  console.log('Stopping server gracefully...');
  clearInterval(dailyReminderInterval);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

