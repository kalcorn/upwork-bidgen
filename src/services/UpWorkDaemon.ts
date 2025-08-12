// src/services/UpWorkDaemon.ts - Background daemon for OAuth callbacks and messaging webhooks
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

export interface DaemonConfig {
  port: number;
  host: string;
  callbackPath: string;
  webhookPath: string;
  statusPath: string;
  useHttps?: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  enableLogging?: boolean;
  logFilePath?: string;
}

export interface OAuthCallbackData {
  code: string;
  state?: string;
  timestamp: number;
}

export interface DaemonStatus {
  running: boolean;
  port: number;
  startTime: number;
  callbacks: number;
  messages: number;
  pid?: number;
}

export class UpWorkDaemon {
  private app: Express;
  private server: Server | null = null;
  private config: DaemonConfig;
  private status: DaemonStatus;
  private pendingCallbacks: Map<string, OAuthCallbackData> = new Map();
  private statusFile: string;
  private logStream: fs.WriteStream | null = null;

  constructor(config: Partial<DaemonConfig> = {}) {
    this.config = {
      port: config.port || 8947, // Permanent port for firewall configuration
      host: config.host || '0.0.0.0', // Listen on all interfaces for external access
      callbackPath: config.callbackPath || '/oauth/callback',
      webhookPath: config.webhookPath || '/webhooks/upwork',
      statusPath: config.statusPath || '/status',
      useHttps: config.useHttps ?? true, // Default to HTTPS for .dev domain
      sslCertPath: config.sslCertPath || path.resolve(__dirname, '../../certs/home.alcorn.dev-chain.pem'),
      sslKeyPath: config.sslKeyPath || path.resolve(__dirname, '../../certs/home.alcorn.dev-key.pem'),
      enableLogging: config.enableLogging ?? true, // Default to enabled
      logFilePath: config.logFilePath || path.resolve('daemon.log'),
      ...config
    };

    this.status = {
      running: false,
      port: this.config.port,
      startTime: 0,
      callbacks: 0,
      messages: 0
    };

    this.statusFile = path.resolve('.daemon-status.json');
    this.app = this.createExpressApp();
    this.initializeLogging();
  }

  private initializeLogging(): void {
    if (this.config.enableLogging) {
      try {
        this.logStream = fs.createWriteStream(this.config.logFilePath!, { 
          flags: 'a', // append mode
          encoding: 'utf8' 
        });
        
        this.log('Daemon logging initialized', `Log file: ${this.config.logFilePath}`);
      } catch (error) {
        console.error('Failed to initialize log file:', error);
        this.config.enableLogging = false;
      }
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
    
    if (this.config.enableLogging && this.logStream) {
      this.logStream.write(logLine);
    }
    
    // Also output to console for immediate feedback
    console.log(`[${level}] ${message}`, ...args);
  }

  private createExpressApp(): Express {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // CORS for local development
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // OAuth callback endpoint
    app.get(this.config.callbackPath, this.handleOAuthCallback.bind(this));

    // Webhook endpoint for UpWork messaging
    app.post(this.config.webhookPath, this.handleWebhook.bind(this));

    // Status endpoint
    app.get(this.config.statusPath, this.handleStatus.bind(this));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Get pending OAuth callbacks
    app.get('/oauth/pending', this.handleGetPendingCallbacks.bind(this));

    // Clear processed OAuth callback
    app.delete('/oauth/callback/:id', this.handleClearCallback.bind(this));

    // Stop daemon endpoint
    app.post('/stop', this.handleStop.bind(this));

    return app;
  }

  private handleOAuthCallback(req: Request, res: Response): void {
    try {
      const { code, state, error } = req.query;

      if (error) {
        this.log('ERROR', 'OAuth error:', error);
        res.status(400).send(`
          <html>
            <body>
              <h1>OAuth Error</h1>
              <p>Error: ${error}</p>
              <p>Description: ${req.query['error_description'] || 'Unknown error'}</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);
        return;
      }

      if (!code) {
        res.status(400).send(`
          <html>
            <body>
              <h1>OAuth Error</h1>
              <p>No authorization code received</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);
        return;
      }

      // Store the callback data
      const callbackId = Date.now().toString();
      const callbackData: OAuthCallbackData = {
        code: code as string,
        state: state as string,
        timestamp: Date.now()
      };

      this.pendingCallbacks.set(callbackId, callbackData);
      this.status.callbacks++;

      this.log('INFO', `OAuth callback received: ${callbackId}`);

      // Send success response
      res.send(`
        <html>
          <head>
            <title>Authorization Successful</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                     text-align: center; padding: 50px; background: #f5f5f5; }
              .success { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                        display: inline-block; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #28a745; margin: 0 0 20px 0; }
              p { color: #666; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="success">
              <div class="icon">✅</div>
              <h1>Authorization Successful!</h1>
              <p>You can now close this tab and return to your terminal.</p>
              <p><small>Callback ID: ${callbackId}</small></p>
            </div>
            <script>
              // Auto-close after 5 seconds
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      this.log('ERROR', 'Error handling OAuth callback:', error);
      res.status(500).send('Internal server error');
    }
  }

  private handleWebhook(req: Request, res: Response): void {
    try {
      this.log('INFO', 'Webhook received:', req.body);

      // TODO: Process UpWork webhook data
      // This will handle messaging events, job updates, etc.

      this.status.messages++;
      res.json({ status: 'received', timestamp: Date.now() });
    } catch (error) {
      this.log('ERROR', 'Error handling webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private handleStatus(_req: Request, res: Response): void {
    res.json({
      ...this.status,
      uptime: this.status.running ? Date.now() - this.status.startTime : 0,
      pendingCallbacks: this.pendingCallbacks.size
    });
  }

  private handleGetPendingCallbacks(_req: Request, res: Response): void {
    const callbacks = Array.from(this.pendingCallbacks.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
    res.json(callbacks);
  }

  private handleClearCallback(req: Request, res: Response): void {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing callback ID' });
      return;
    }
    const existed = this.pendingCallbacks.delete(id);
    res.json({ cleared: existed });
  }

  private async handleStop(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: 'Daemon stopping...', pid: process.pid });
      
      // Give response time to send before stopping
      setTimeout(async () => {
        this.log('INFO', 'Stop request received via HTTP endpoint');
        await this.stop();
        process.exit(0);
      }, 100);
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop daemon' });
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = this.config.useHttps ? 'https' : 'http';

        if (this.config.useHttps) {
          // Load SSL certificates for HTTPS
          try {
            const sslOptions = {
              key: fs.readFileSync(this.config.sslKeyPath!),
              cert: fs.readFileSync(this.config.sslCertPath!)
            };

            this.server = https.createServer(sslOptions, this.app).listen(
              this.config.port,
              this.config.host,
              () => {
                this.status.running = true;
                this.status.startTime = Date.now();
                this.status.pid = process.pid;

                this.log('INFO', `UpWork Daemon started on ${protocol}://${this.config.host}:${this.config.port}`);
                this.log('INFO', `OAuth callback: ${protocol}://${this.config.host}:${this.config.port}${this.config.callbackPath}`);
                this.log('INFO', `Webhook endpoint: ${protocol}://${this.config.host}:${this.config.port}${this.config.webhookPath}`);
                this.log('INFO', `SSL certificate: ${this.config.sslCertPath}`);

                this.saveStatus();
                resolve();
              }
            );
          } catch (certError) {
            this.log('ERROR', 'Failed to load SSL certificates:', certError);
            this.log('ERROR', 'Please ensure SSL certificates exist in certs/ directory');
            reject(certError);
            return;
          }
        } else {
          reject(new Error('useHttps is disabled - daemon requires HTTPS for .dev domain OAuth'));
        }

        this.server!.on('error', (error) => {
          this.log('ERROR', 'Daemon server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }


  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.status.running = false;
          delete this.status.pid;
          this.log('INFO', 'UpWork Daemon stopped');
          this.saveStatus();
          
          // Close log stream
          if (this.logStream) {
            this.logStream.end();
          }
          
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private saveStatus(): void {
    try {
      fs.writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('Error saving daemon status:', error);
    }
  }

  getCallbackUrl(): string {
    return `http://${this.config.host}:${this.config.port}${this.config.callbackPath}`;
  }

  getWebhookUrl(): string {
    return `http://${this.config.host}:${this.config.port}${this.config.webhookPath}`;
  }

  // Get public URLs for UpWork API configuration
  getPublicCallbackUrl(): string {
    const protocol = this.config.useHttps ? 'https' : 'http';
    return `${protocol}://home.alcorn.dev:${this.config.port}${this.config.callbackPath}`;
  }

  getPublicWebhookUrl(): string {
    const protocol = this.config.useHttps ? 'https' : 'http';
    return `${protocol}://home.alcorn.dev:${this.config.port}${this.config.webhookPath}`;
  }


  getStatus(): DaemonStatus {
    return { ...this.status };
  }

  // Static method to check if daemon is running
  static async isDaemonRunning(): Promise<boolean> {
    const status = UpWorkDaemon.loadStatusFromFile();
    if (!status?.pid) {
      return false;
    }
    
    return UpWorkDaemon.isProcessRunning(status.pid);
  }

  // Static method to get daemon status
  static async getDaemonStatus(): Promise<any> {
    const status = UpWorkDaemon.loadStatusFromFile();
    if (!status?.pid || !UpWorkDaemon.isProcessRunning(status.pid)) {
      return null;
    }
    
    // Return status from file with calculated uptime
    return {
      ...status,
      uptime: status.running ? Date.now() - status.startTime : 0,
      pendingCallbacks: 0 // We can't get this without network call, but it's rarely needed
    };
  }

  // Static method to get pending callbacks
  static async getPendingCallbacks(port: number = 8947): Promise<Array<OAuthCallbackData & { id: string }>> {
    try {
      const response = await fetch(`https://home.alcorn.dev:${port}/oauth/pending`);

      if (!response.ok) {
        throw new Error(`Failed to fetch pending callbacks: ${response.statusText}`);
      }

      const data = await response.json();
      return data as Array<OAuthCallbackData & { id: string }>;
    } catch (error) {
      console.error('Error fetching pending callbacks:', error);
      return [];
    }
  }

  // Static method to load daemon status from unified config
  static loadStatusFromFile(): DaemonStatus | null {
    try {
      const { ConfigManager } = require('../core/ConfigManager');
      const configManager = new ConfigManager();
      return configManager.getDaemonStatus();
    } catch {
      return null;
    }
  }

  // Static method to check if PID is running
  static isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  // Static method for bulletproof daemon stop
  static async stopDaemon(): Promise<{ success: boolean; message: string }> {
    try {
      // Method 1: PID-based termination
      const status = UpWorkDaemon.loadStatusFromFile();
      if (status?.pid && UpWorkDaemon.isProcessRunning(status.pid)) {
        try {
          process.kill(status.pid, 'SIGTERM');
          
          // Wait for graceful shutdown
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!UpWorkDaemon.isProcessRunning(status.pid)) {
              // If process stopped, update status file (since Windows SIGTERM may not trigger handlers)
              UpWorkDaemon.updateStatusFileOnStop();
              return { success: true, message: 'Daemon stopped via SIGTERM' };
            }
          }
          
          // Force kill if still running
          process.kill(status.pid, 'SIGKILL');
          // Always update status file after force kill
          UpWorkDaemon.updateStatusFileOnStop();
          return { success: true, message: 'Daemon force-killed via SIGKILL' };
          
        } catch (pidError) {
          return { success: false, message: 'Failed to terminate daemon process' };
        }
      }

      // No daemon process found - but clean up status file anyway
      UpWorkDaemon.updateStatusFileOnStop();
      return { success: true, message: 'No daemon process found (already stopped)' };

    } catch (error) {
      return { 
        success: false, 
        message: `Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Static method to update status file when daemon stops
  static updateStatusFileOnStop(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const statusFile = path.resolve('.daemon-status.json');
      
      const currentStatus = UpWorkDaemon.loadStatusFromFile();
      if (currentStatus) {
        const updatedStatus = {
          ...currentStatus,
          running: false,
          pid: undefined
        };
        fs.writeFileSync(statusFile, JSON.stringify(updatedStatus, null, 2));
      }
    } catch (error) {
      console.error('Failed to update status file on stop:', error);
    }
  }
}