// src/core/CredentialsManager.ts - Simple credential management for personal use using unified config
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import inquirer from 'inquirer';
import { UpWorkCredentials } from '../types/API';
import { ConfigManager, Credentials } from './ConfigManager';

export class CredentialsManager {
  private configManager: ConfigManager;
  private encryptionKey: string | null;

  constructor(configFile: string = 'bidgen.json') {
    this.configManager = new ConfigManager(configFile);
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * Get encryption key from secure file or generate one
   */
  private getEncryptionKey(): string | null {
    const keyFile = path.join(process.cwd(), '.encryption-key');
    
    try {
      // Try to read existing key file
      if (fs.existsSync(keyFile)) {
        const key = fs.readFileSync(keyFile, 'utf8').trim();
        if (key.length >= 16) {
          return key;
        }
      }
      
      // Generate new key if none exists
      const newKey = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, newKey);
      fs.chmodSync(keyFile, 0o600); // Owner read/write only
      
      console.log('🔐 Generated new encryption key for secure credential storage');
      return newKey;
      
    } catch (error) {
      console.error('❌ Failed to manage encryption key:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): { iv: string; encrypted: string } {
    if (!this.encryptionKey) {
      throw new Error('No encryption key available');
    }
    
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted
    };
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: { iv: string; encrypted: string }): string {
    if (!this.encryptionKey) {
      throw new Error('No encryption key available');
    }
    
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store credentials securely
   */
  async saveCredentials(credentials: UpWorkCredentials): Promise<boolean> {
    try {
      // Basic validation
      if (!credentials.apiKey || !credentials.apiSecret) {
        throw new Error('API key and secret are required');
      }

      // Encrypt credentials
      const encryptedCredentials: Credentials = {
        apiKey: this.encrypt(credentials.apiKey),
        apiSecret: this.encrypt(credentials.apiSecret),
        accessToken: this.encrypt(credentials.accessToken || ''),
        refreshToken: this.encrypt(credentials.refreshToken || ''),
        encryptedAt: new Date().toISOString()
      };

      // Update unified config
      const success = this.configManager.updateCredentials(encryptedCredentials);
      
      if (success) {
        console.log('✅ Credentials stored securely');
      }
      return success;
      
    } catch (error) {
      console.error('❌ Failed to store credentials:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Load credentials securely
   */
  async loadCredentials(): Promise<UpWorkCredentials | null> {
    try {
      const encryptedData = this.configManager.getCredentials();
      if (!encryptedData) {
        return null;
      }

      // Decrypt credentials
      const credentials: UpWorkCredentials = {
        apiKey: encryptedData.apiKey ? this.decrypt(encryptedData.apiKey) : '',
        apiSecret: encryptedData.apiSecret ? this.decrypt(encryptedData.apiSecret) : '',
        accessToken: encryptedData.accessToken ? this.decrypt(encryptedData.accessToken) : '',
        refreshToken: encryptedData.refreshToken ? this.decrypt(encryptedData.refreshToken) : ''
      };

      return credentials;
      
    } catch (error) {
      console.error('❌ Failed to load credentials:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Remove stored credentials
   */
  async removeCredentials(): Promise<boolean> {
    try {
      const emptyCredentials: Credentials = {
        apiKey: { iv: "", encrypted: "" },
        apiSecret: { iv: "", encrypted: "" },
        accessToken: { iv: "", encrypted: "" },
        refreshToken: { iv: "", encrypted: "" },
        encryptedAt: ""
      };
      
      const success = this.configManager.updateCredentials(emptyCredentials);
      if (success) {
        console.log('✅ Credentials removed');
      }
      return success;
      
    } catch (error) {
      console.error('❌ Failed to remove credentials:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Check if credentials exist
   */
  hasCredentials(): boolean {
    try {
      const credentials = this.configManager.getCredentials();
      return !!(credentials?.apiKey?.encrypted && credentials?.apiSecret?.encrypted);
    } catch {
      return false;
    }
  }

  /**
   * Setup credentials interactively
   */
  async setupCredentials(): Promise<boolean> {
    try {
      console.log('🔐 UpWork API Credentials Setup');
      console.log('================================');

      const credentials: UpWorkCredentials = {
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        refreshToken: ''
      };

      // Get API credentials
      console.log('\n📋 Please enter your UpWork API credentials:');
      console.log('   (Get these from https://www.upwork.com/services/api/apply)');
      
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your UpWork API Key:',
          validate: (input: string) => input.length > 0 ? true : 'API Key is required'
        }
      ]);

      const { apiSecret } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiSecret',
          message: 'Enter your UpWork API Secret:',
          validate: (input: string) => input.length > 0 ? true : 'API Secret is required'
        }
      ]);

      credentials.apiKey = apiKey;
      credentials.apiSecret = apiSecret;

      // Store credentials
      const success = await this.saveCredentials(credentials);
      if (success) {
        console.log('✅ Credentials setup completed successfully');
        console.log('   File: bidgen.json');
        return true;
      } else {
        console.error('❌ Failed to save credentials');
        return false;
      }

    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get credentials file path
   */
  getCredentialsFilePath(): string {
    return path.resolve('bidgen.json');
  }

  /**
   * Check if encryption is available
   */
  isEncryptionAvailable(): boolean {
    return !!this.encryptionKey;
  }

  /**
   * Check if encryption is available and show warning if not
   */
  checkEncryption(): boolean {
    if (!this.encryptionKey) {
      console.log('⚠️ No encryption key available. Check file permissions for .encryption-key');
      return false;
    }
    return true;
  }

  /**
   * Clear expired tokens while preserving API keys
   */
  async clearTokens(): Promise<boolean> {
    try {
      const credentials = await this.loadCredentials();
      if (credentials) {
        // Preserve API keys, clear only tokens
        const updatedCredentials: UpWorkCredentials = {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          accessToken: '',
          refreshToken: ''
        };
        
        await this.saveCredentials(updatedCredentials);
        console.log('🗑️ Cleared expired tokens, preserved API keys');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to clear tokens:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Clear/delete stored credentials completely
   */
  async clearCredentials(): Promise<boolean> {
    try {
      await this.removeCredentials();
      console.log('🗑️ Cleared all credentials');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear credentials:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}

 