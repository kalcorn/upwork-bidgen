// credentialsManager.js - Secure credential management following security best practices
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CredentialsManager {
  constructor(credentialsFile) {
    this.credentialsFile = credentialsFile;
    this.encryptionKey = this.getEncryptionKey();
  }

  // Get encryption key from system (prefer secure key management)
  getEncryptionKey() {
    // Priority order for encryption key:
    // 1. System keyring/credential manager
    // 2. Environment variable (temporary, not recommended for production)
    // 3. User prompt for manual entry
    
    // For now, use environment variable as fallback
    const key = process.env.UPWORK_ENCRYPTION_KEY;
    if (!key) {
      console.log('⚠️ Security Warning: No encryption key found');
      console.log('   Set UPWORK_ENCRYPTION_KEY environment variable for secure credential storage');
      console.log('   Or use a system credential manager for production use');
      return null;
    }
    return key;
  }

  // Encrypt sensitive data
  encrypt(text) {
    if (!this.encryptionKey) {
      throw new Error('No encryption key available');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('No encryption key available');
    }
    
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Store credentials securely
  async storeCredentials(credentials) {
    try {
      // Validate credentials structure
      const required = ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret'];
      for (const field of required) {
        if (!credentials[field]) {
          throw new Error(`Missing required credential: ${field}`);
        }
      }

      // Encrypt credentials
      const encryptedCredentials = {
        apiKey: this.encrypt(credentials.apiKey),
        apiSecret: this.encrypt(credentials.apiSecret),
        accessToken: this.encrypt(credentials.accessToken),
        accessTokenSecret: this.encrypt(credentials.accessTokenSecret),
        createdAt: new Date().toISOString()
      };

      // Write to file with restricted permissions
      const filePath = path.resolve(this.credentialsFile);
      fs.writeFileSync(filePath, JSON.stringify(encryptedCredentials, null, 2));
      
      // Set restrictive file permissions (600 = owner read/write only)
      fs.chmodSync(filePath, 0o600);
      
      console.log('✅ Credentials stored securely');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to store credentials:', error.message);
      return false;
    }
  }

  // Load credentials securely
  async loadCredentials() {
    try {
      // Check if credentials file exists
      if (!fs.existsSync(this.credentialsFile)) {
        return null;
      }

      // Read encrypted credentials
      const encryptedData = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
      
      // Decrypt credentials
      const credentials = {
        apiKey: this.decrypt(encryptedData.apiKey),
        apiSecret: this.decrypt(encryptedData.apiSecret),
        accessToken: this.decrypt(encryptedData.accessToken),
        accessTokenSecret: this.decrypt(encryptedData.accessTokenSecret)
      };

      return credentials;
      
    } catch (error) {
      console.error('❌ Failed to load credentials:', error.message);
      return null;
    }
  }

  // Remove stored credentials
  async removeCredentials() {
    try {
      if (fs.existsSync(this.credentialsFile)) {
        fs.unlinkSync(this.credentialsFile);
        console.log('✅ Credentials removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to remove credentials:', error.message);
      return false;
    }
  }

  // Check if credentials exist
  hasCredentials() {
    return fs.existsSync(this.credentialsFile);
  }

  // Interactive credential setup
  async setupCredentials() {
    const inquirer = require('inquirer').default || require('inquirer');
    
    console.log('\n🔐 UpWork API Credential Setup');
    console.log('==============================');
    console.log('This will securely store your UpWork API credentials.');
    console.log('Credentials will be encrypted and stored locally.\n');

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your UpWork API Key:',
        validate: input => input.length > 0 ? true : 'API Key is required'
      },
      {
        type: 'password',
        name: 'apiSecret',
        message: 'Enter your UpWork API Secret:',
        validate: input => input.length > 0 ? true : 'API Secret is required'
      },
      {
        type: 'password',
        name: 'accessToken',
        message: 'Enter your UpWork Access Token:',
        validate: input => input.length > 0 ? true : 'Access Token is required'
      },
      {
        type: 'password',
        name: 'accessTokenSecret',
        message: 'Enter your UpWork Access Token Secret:',
        validate: input => input.length > 0 ? true : 'Access Token Secret is required'
      }
    ]);

    const success = await this.storeCredentials(answers);
    if (success) {
      console.log('\n✅ Credentials stored successfully!');
      console.log('   You can now enable API mode in config.js');
    } else {
      console.log('\n❌ Failed to store credentials');
    }
    
    return success;
  }
}

module.exports = { CredentialsManager }; 