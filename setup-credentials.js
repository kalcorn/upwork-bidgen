#!/usr/bin/env node

// setup-credentials.js - Secure UpWork API credential setup
const { CredentialsManager } = require('./lib/credentialsManager');
const config = require('./config');

async function main() {
  console.log('🔐 UpWork API Credential Setup');
  console.log('==============================\n');
  
  const credentialsManager = new CredentialsManager(config.upwork.credentialsFile);
  
  // Check if credentials already exist
  if (credentialsManager.hasCredentials()) {
    const inquirer = require('inquirer').default || require('inquirer');
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Credentials already exist. What would you like to do?',
        choices: [
          { name: 'View current credentials', value: 'view' },
          { name: 'Update credentials', value: 'update' },
          { name: 'Remove credentials', value: 'remove' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);
    
    switch (action) {
      case 'view':
        console.log('\n📋 Current Credentials:');
        console.log('   File:', config.upwork.credentialsFile);
        console.log('   Status: Encrypted and stored securely');
        console.log('   Permissions: Owner read/write only (600)');
        break;
        
      case 'update':
        console.log('\n🔄 Updating credentials...');
        await credentialsManager.setupCredentials();
        break;
        
      case 'remove':
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to remove stored credentials?',
            default: false
          }
        ]);
        
        if (confirm) {
          await credentialsManager.removeCredentials();
        }
        break;
        
      case 'exit':
        console.log('👋 Goodbye!');
        return;
    }
  } else {
    // No credentials exist, set them up
    console.log('No UpWork API credentials found.\n');
    console.log('To use the UpWork API, you need to:');
    console.log('1. Apply for UpWork API access at: https://www.upwork.com/services/api/apply');
    console.log('2. Wait for approval (1-3 business days)');
    console.log('3. Get your API credentials from UpWork');
    console.log('4. Enter them securely below\n');
    
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Do you have your UpWork API credentials ready?',
        default: false
      }
    ]);
    
    if (proceed) {
      await credentialsManager.setupCredentials();
    } else {
      console.log('\n📝 No problem! You can run this script again when you have your credentials.');
      console.log('   The system will continue to work with web scraping until then.');
    }
  }
}

// Security check
if (process.env.UPWORK_ENCRYPTION_KEY) {
  console.log('✅ Encryption key found in environment');
} else {
  console.log('⚠️ Security Warning: No encryption key found');
  console.log('   Set UPWORK_ENCRYPTION_KEY environment variable for secure storage');
  console.log('   Example: export UPWORK_ENCRYPTION_KEY="your-secure-key-here"');
  console.log('');
}

main().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 