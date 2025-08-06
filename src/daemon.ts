import { UpWorkDaemon } from './services/UpWorkDaemon';


async function startDaemon() {
  const daemon = new UpWorkDaemon();
  try {
    await daemon.start();

    // Keep the process alive
    process.stdin.resume();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Daemon received SIGINT. Shutting down...');
      await daemon.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Daemon received SIGTERM. Shutting down...');
      await daemon.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start daemon:', error);
    process.exit(1);
  }
}

startDaemon();
