#!/usr/bin/env node

// src/cli/daemon.ts - Daemon management CLI commands
import { UpWorkDaemon } from '../services/UpWorkDaemon';

// Check if this is being called as daemon process
if (process.argv[2] === '_daemon_process') {
  // This is the actual daemon process
  (async () => {
    try {
      const daemon = new UpWorkDaemon();
      await daemon.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        daemon.stop().then(() => {
          process.exit(0);
        }).catch((error) => {
          console.error('Error during shutdown:', error);
          process.exit(1);
        });
      });

      process.on('SIGTERM', () => {
        daemon.stop().then(() => {
          process.exit(0);
        }).catch((error) => {
          console.error('Error during shutdown:', error);
          process.exit(1);
        });
      });

      // Keep process alive
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Daemon process error:', error);
      process.exit(1);
    }
  })();
} else {
  // This is the CLI
  async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'start':
        await startDaemon();
        break;
      case 'stop':
        await stopDaemon();
        break;
      case 'status':
        await showStatus();
        break;
      case 'restart':
        await stopDaemon();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startDaemon();
        break;
      case 'logs':
        await showLogs();
        break;
      case 'logs-enable':
        await enableLogging();
        break;
      case 'logs-disable':
        await disableLogging();
        break;
      default:
        console.log('Usage: npx ts-node src/cli/daemon.ts [command]');
        console.log('');
        console.log('Commands:');
        console.log('  start        - Start the UpWork daemon (HTTPS)');
        console.log('  stop         - Stop the UpWork daemon');
        console.log('  status       - Show daemon status');
        console.log('  restart      - Restart the daemon');
        console.log('  logs         - Show recent daemon logs');
        console.log('  logs-enable  - Enable daemon logging');
        console.log('  logs-disable - Disable daemon logging');
        break;
    }
  }

  async function startDaemon(): Promise<void> {
    try {
      // Check if already running
      if (await UpWorkDaemon.isDaemonRunning()) {
        console.log('⚠️  Daemon is already running');
        return;
      }

      console.log('🔄 Starting daemon...');
      
      // Spawn daemon using simple node spawn (debug approach)
      const { spawn } = require('child_process');
      const path = require('path');
      
      const daemonScript = path.resolve(__filename);
      
      const daemonProcess = spawn(process.execPath, ['-r', 'ts-node/register', daemonScript, '_daemon_process'], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      daemonProcess.unref();
      
      // Add error handling
      daemonProcess.on('error', (error: any) => {
        console.error('Daemon spawn error:', error.message);
      });
      
      // Give daemon time to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify it started
      if (await UpWorkDaemon.isDaemonRunning()) {
        console.log('✅ Daemon started successfully');
      } else {
        console.log('⚠️  Daemon may have failed to start');
      }

    } catch (error) {
      console.error('❌ Failed to start daemon:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  async function stopDaemon(): Promise<void> {
    try {
      const result = await UpWorkDaemon.stopDaemon();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        console.log('💡 You may need to manually terminate the process');
      }
    } catch (error) {
      console.error('❌ Error stopping daemon:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async function showStatus(): Promise<void> {
    try {
      const isRunning = await UpWorkDaemon.isDaemonRunning();
      
      if (!isRunning) {
        console.log('🔴 Daemon Status: Not Running');
        console.log('💡 Start with: npx ts-node src/cli/daemon.ts start');
        return;
      }

      const status = await UpWorkDaemon.getDaemonStatus();
      if (!status) {
        console.log('⚠️  Could not retrieve daemon status');
        return;
      }

      console.log('🟢 Daemon Status: Running');
      console.log(`📊 Port: ${status.port}`);
      console.log(`🆔 PID: ${status.pid || 'Unknown'}`);
      console.log(`⏱️  Uptime: ${Math.floor(status.uptime / 1000)}s`);
      console.log(`📥 OAuth Callbacks: ${status.callbacks}`);
      console.log(`📨 Webhook Messages: ${status.messages}`);
      console.log(`⏳ Pending Callbacks: ${status.pendingCallbacks || 0}`);
      
      // Show callback URLs for reference
      console.log('');
      console.log('🔗 Local Endpoints:');
      console.log(`   OAuth Callback: http://localhost:${status.port}/oauth/callback`);
      console.log(`   Webhooks: http://localhost:${status.port}/webhooks/upwork`);
      console.log('');
      console.log('🌐 Public Endpoints (for UpWork configuration):');
      console.log(`   OAuth Callback: http://home.alcorn.dev:${status.port}/oauth/callback`);
      console.log(`   Webhooks: http://home.alcorn.dev:${status.port}/webhooks/upwork`);

      // Show pending callbacks if any
      const pending = await UpWorkDaemon.getPendingCallbacks();
      if (pending.length > 0) {
        console.log('');
        console.log('⏳ Pending OAuth Callbacks:');
        pending.forEach((callback, index) => {
          const age = Math.floor((Date.now() - callback.timestamp) / 1000);
          console.log(`   ${index + 1}. ID: ${callback.id} (${age}s ago)`);
        });
      }

    } catch (error) {
      console.error('❌ Error checking daemon status:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async function showLogs(): Promise<void> {
    try {
      const fs = require('fs');
      const logFile = 'daemon.log';
      
      if (!fs.existsSync(logFile)) {
        console.log('📝 No log file found');
        console.log('💡 Logs are created when daemon starts with logging enabled');
        return;
      }

      console.log(`📝 Recent daemon logs (${logFile}):`);
      console.log('='.repeat(60));
      
      // Show last 50 lines
      const { spawn } = require('child_process');
      const tailProcess = spawn('powershell', ['-Command', `Get-Content "${logFile}" | Select-Object -Last 50`]);
      
      tailProcess.stdout.on('data', (data: Buffer) => {
        process.stdout.write(data.toString());
      });
      
      tailProcess.on('close', (code: number) => {
        console.log('='.repeat(60));
        if (code !== 0) {
          console.log('⚠️  Could not read log file');
        }
      });

    } catch (error) {
      console.error('❌ Error reading logs:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async function enableLogging(): Promise<void> {
    console.log('✅ Daemon logging is enabled by default');
    console.log('💡 Restart daemon if currently running to apply logging');
    console.log('📝 Log file: daemon.log');
  }

  async function disableLogging(): Promise<void> {
    console.log('⚠️  To disable logging, start daemon with logging disabled:');
    console.log('💡 This requires code modification in UpWorkDaemon config');
    console.log('📝 Current log file will remain: daemon.log');
  }

  // Run the CLI
  main().catch(error => {
    console.error('❌ Daemon CLI error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}