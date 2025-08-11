// src/runners/GeminiRunner.ts - Gemini CLI integration for proposal enhancement
import { exec, ExecException } from 'child_process';
import fs from 'fs';

export interface GeminiRunnerOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface GeminiEnhancementResult {
  success: boolean;
  enhancedContent?: string;
  error?: string;
  debugInfo?: {
    versionCheck?: string;
    helpCheck?: string;
    executionError?: string;
    stdout?: string;
    stderr?: string;
  };
}

export class GeminiRunner {
  // private _options: Required<GeminiRunnerOptions>; // Unused

  constructor(_options: GeminiRunnerOptions = {}) {
    // Options are currently unused but kept for future use
  }

  /**
   * Enhance a proposal using Gemini CLI
   */
  async enhanceProposal(promptPath: string): Promise<GeminiEnhancementResult> {
    try {
      // Read the file content and pass it as a prompt to Gemini CLI
      const promptContent = fs.readFileSync(promptPath, 'utf-8');
      
      // Create a proper prompt for Gemini to enhance/customize the proposal
      const enhancementPrompt = `Please review and enhance this UpWork proposal to make it more compelling and personalized. Keep the core structure and contact information, but improve the language, flow, and persuasiveness:

${promptContent}

Please provide an enhanced version that:
1. Maintains the professional tone
2. Makes stronger connections to the specific job requirements
3. Improves the value proposition
4. Keeps all contact information intact`;

      // Check if Gemini CLI is available
      console.log('🔍 Checking if Gemini CLI is available...');
      
      const versionCheck = await this.checkGeminiVersion();
      if (!versionCheck.success) {
        return {
          success: false,
          error: 'Gemini CLI not found or not properly installed',
          debugInfo: { versionCheck: versionCheck.error || 'Unknown error' }
        };
      }

      console.log('✅ Gemini CLI found:', versionCheck.version || 'Version info available');
      
      // Test if gemini command works
      console.log('🔍 Testing Gemini functionality...');
      const helpCheck = await this.checkGeminiHelp();
      if (!helpCheck.success) {
        return {
          success: false,
          error: 'Gemini CLI found but not working properly',
          debugInfo: { helpCheck: helpCheck.error || 'Unknown error' }
        };
      }

      console.log('✅ Gemini functionality confirmed');
      
      // If both checks pass, try to enhance the proposal
      const cmd = 'gemini';
      console.log('🔍 Attempting to run Gemini with command:', cmd);
      
      const result = await this.executeGemini(cmd, enhancementPrompt);
      
      if (result.success && result.enhancedContent) {
        console.log('\n🤖 Enhanced proposal from Gemini:');
        console.log('═'.repeat(50));
        console.log(result.enhancedContent);
        console.log('═'.repeat(50));
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error reading proposal file: ${errorMessage}`);
      console.log('📝 Proposal saved without Gemini enhancement.');
      
      return {
        success: false,
        error: `File read error: ${errorMessage}`,
        debugInfo: { executionError: errorMessage }
      };
    }
  }

  /**
   * Check if Gemini CLI is available and get version
   */
  private async checkGeminiVersion(): Promise<{ success: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      exec('gemini --version', (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          const errorMsg = `Gemini CLI not found. Please install it first:
   npm install -g @google/gemini-cli
   Then authenticate with: gemini auth

Debug Info:
   Error: ${error.message}
   Error Code: ${error.code}
   STDOUT: ${stdout || 'none'}
   STDERR: ${stderr || 'none'}`;
          
          console.log('⚠️ Gemini CLI not found. Please install it first:');
          console.log('   npm install -g @google/gemini-cli');
          console.log('   Then authenticate with: gemini auth');
          console.log('\n📝 Proposal saved without Gemini enhancement.');
          
          resolve({ success: false, error: errorMsg });
          return;
        }
        
        resolve({ success: true, version: stdout?.trim() });
      });
    });
  }

  /**
   * Check if Gemini help functionality is available
   */
  private async checkGeminiHelp(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      exec('gemini --help', (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          const errorMsg = `Gemini CLI found but not working properly.
   Please ensure you have the latest version: npm install -g @google/gemini-cli
   Then authenticate with: gemini auth

Debug Info:
   Error: ${error.message}
   Error Code: ${error.code}
   STDOUT: ${stdout || 'none'}
   STDERR: ${stderr || 'none'}`;
          
          console.log('⚠️ Gemini CLI found but not working properly.');
          console.log('   Please ensure you have the latest version: npm install -g @google/gemini-cli');
          console.log('   Then authenticate with: gemini auth');
          console.log('\n📝 Proposal saved without Gemini enhancement.');
          
          resolve({ success: false, error: errorMsg });
          return;
        }
        
        resolve({ success: true });
      });
    });
  }

  /**
   * Execute Gemini CLI with the enhancement prompt
   */
  private async executeGemini(cmd: string, prompt: string): Promise<GeminiEnhancementResult> {
    return new Promise((resolve) => {
      const subprocess = exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          // Check for specific error types
          if (stdout && stdout.includes('usage limit reached')) {
            console.log('⚠️ Gemini usage limit reached. Proposal saved without AI enhancement.');
            console.log('   This is a rate limit from Google. Try again later or use Claude/ChatGPT options.');
            
            resolve({
              success: false,
              error: 'Gemini usage limit reached',
              debugInfo: { stdout, stderr: stderr || 'none' }
            });
            return;
          } else if (stdout && stdout.includes('authentication')) {
            console.log('⚠️ Gemini authentication required. Proposal saved without AI enhancement.');
            console.log('   Please authenticate with: gemini auth');
            
            resolve({
              success: false,
              error: 'Gemini authentication required',
              debugInfo: { stdout, stderr: stderr || 'none' }
            });
            return;
          } else {
            console.log('⚠️ Gemini enhancement failed. Proposal saved without AI enhancement.');
            console.log('   To use Gemini, install: npm install -g @google/gemini-cli');
            console.log('   Then authenticate: gemini auth');
          }
          
          console.log('\n🔍 Debug Information:');
          console.log('   Error:', error.message);
          console.log('   Error Code:', error.code);
          console.log('   Error Signal:', error.signal);
          if (stdout) console.log('   STDOUT:', stdout);
          if (stderr) console.log('   STDERR:', stderr);
          
          resolve({
            success: false,
            error: `Gemini execution failed: ${error.message}`,
            debugInfo: {
              executionError: error.message,
              stdout: stdout || 'none',
              stderr: stderr || 'none'
            }
          });
          return;
        }
        
        if (stderr) {
          console.error(`Gemini stderr: ${stderr}`);
        }
        
        resolve({
          success: true,
          enhancedContent: stdout,
          debugInfo: { stderr: stderr || 'none' }
        });
      });

      // Pass the prompt via stdin
      subprocess.stdin?.write(prompt);
      subprocess.stdin?.end();
    });
  }

  /**
   * Check if Gemini CLI is available without running enhancement
   */
  async isAvailable(): Promise<boolean> {
    const versionCheck = await this.checkGeminiVersion();
    if (!versionCheck.success) return false;
    
    const helpCheck = await this.checkGeminiHelp();
    return helpCheck.success;
  }
}

// Export a default instance
export const geminiRunner = new GeminiRunner(); 