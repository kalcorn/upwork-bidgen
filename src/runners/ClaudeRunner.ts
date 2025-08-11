// src/runners/ClaudeRunner.ts - Claude CLI integration for proposal enhancement
import { exec, ExecException } from 'child_process';
import fs from 'fs';
// import path from 'path'; // Unused

export interface ClaudeRunnerOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ClaudeEnhancementResult {
  success: boolean;
  enhancedContent?: string;
  error?: string;
  debugInfo?: {
    versionCheck?: string;
    printCheck?: string;
    executionError?: string;
    stdout?: string;
    stderr?: string;
  };
}

export class ClaudeRunner {
  // private _options: Required<ClaudeRunnerOptions>; // Unused

  constructor(_options: ClaudeRunnerOptions = {}) {
    // Options are currently unused but kept for future use
  }

  /**
   * Enhance a proposal using Claude CLI
   */
  async enhanceProposal(promptPath: string): Promise<ClaudeEnhancementResult> {
    try {
      // Read the file content and pass it as a prompt to Claude CLI
      const promptContent = fs.readFileSync(promptPath, 'utf-8');
      
      // Create a proper prompt for Claude to enhance/customize the proposal
      const enhancementPrompt = `Please review and enhance this UpWork proposal to make it more compelling and personalized. Keep the core structure and contact information, but improve the language, flow, and persuasiveness:

${promptContent}

Please provide an enhanced version that:
1. Maintains the professional tone
2. Makes stronger connections to the specific job requirements
3. Improves the value proposition
4. Keeps all contact information intact`;

      console.log('🔍 Checking if Claude CLI is available...');
      
      // Check if Claude CLI is available
      const versionCheck = await this.checkClaudeVersion();
      if (!versionCheck.success) {
        return {
          success: false,
          error: 'Claude CLI not found or not properly installed',
          debugInfo: { versionCheck: versionCheck.error || 'Unknown error' }
        };
      }

      console.log('✅ Claude CLI found:', versionCheck.version || 'Version info available');
      
      // Test if claude --print works
      console.log('🔍 Testing Claude --print functionality...');
      const printCheck = await this.checkClaudePrint();
      if (!printCheck.success) {
        return {
          success: false,
          error: 'Claude --print option not available',
          debugInfo: { printCheck: printCheck.error || 'Unknown error' }
        };
      }

      console.log('✅ Claude --print functionality confirmed');
      
      // If both checks pass, try to enhance the proposal
      const cmd = 'claude --print';
      console.log('🔍 Attempting to run Claude with command:', cmd);
      
      const result = await this.executeClaude(cmd, enhancementPrompt);
      
      if (result.success && result.enhancedContent) {
        console.log('\n🤖 Enhanced proposal from Claude:');
        console.log('═'.repeat(50));
        console.log(result.enhancedContent);
        console.log('═'.repeat(50));
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error reading proposal file: ${errorMessage}`);
      console.log('📝 Proposal saved without Claude enhancement.');
      
      return {
        success: false,
        error: `File read error: ${errorMessage}`,
        debugInfo: { executionError: errorMessage }
      };
    }
  }

  /**
   * Check if Claude CLI is available and get version
   */
  private async checkClaudeVersion(): Promise<{ success: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      exec('claude --version', (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          const errorMsg = `Claude CLI not found. Please install it first:
   npm install -g @anthropic-ai/claude-code
   Then authenticate with: claude auth

Debug Info:
   Error: ${error.message}
   Error Code: ${error.code}
   STDOUT: ${stdout || 'none'}
   STDERR: ${stderr || 'none'}`;
          
          console.log('⚠️ Claude CLI not found. Please install it first:');
          console.log('   npm install -g @anthropic-ai/claude-code');
          console.log('   Then authenticate with: claude auth');
          console.log('\n📝 Proposal saved without Claude enhancement.');
          
          resolve({ success: false, error: errorMsg });
          return;
        }
        
        resolve({ success: true, version: stdout?.trim() });
      });
    });
  }

  /**
   * Check if Claude --print functionality is available
   */
  private async checkClaudePrint(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      exec('claude --print --help', (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          const errorMsg = `Claude CLI found but --print option not available.
   Please ensure you have the latest version: npm install -g @anthropic-ai/claude-code
   Then authenticate with: claude auth

Debug Info:
   Error: ${error.message}
   Error Code: ${error.code}
   STDOUT: ${stdout || 'none'}
   STDERR: ${stderr || 'none'}`;
          
          console.log('⚠️ Claude CLI found but --print option not available.');
          console.log('   Please ensure you have the latest version: npm install -g @anthropic-ai/claude-code');
          console.log('   Then authenticate with: claude auth');
          console.log('\n📝 Proposal saved without Claude enhancement.');
          
          resolve({ success: false, error: errorMsg });
          return;
        }
        
        resolve({ success: true });
      });
    });
  }

  /**
   * Execute Claude CLI with the enhancement prompt
   */
  private async executeClaude(cmd: string, prompt: string): Promise<ClaudeEnhancementResult> {
    return new Promise((resolve) => {
      const subprocess = exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          // Check for specific error types
          if (stdout && stdout.includes('usage limit reached')) {
            console.log('⚠️ Claude usage limit reached. Proposal saved without AI enhancement.');
            console.log('   This is a rate limit from Anthropic. Try again later or use ChatGPT/Gemini options.');
            if (stdout.includes('|')) {
              const timestamp = stdout.split('|')[1];
              const resetDate = new Date(parseInt(timestamp || '0') * 1000);
              console.log(`   Limit resets around: ${resetDate.toLocaleString()}`);
            }
            
            resolve({
              success: false,
              error: 'Claude usage limit reached',
              debugInfo: { stdout, stderr: stderr || 'none' }
            });
            return;
          } else {
            console.log('⚠️ Claude enhancement failed. Proposal saved without AI enhancement.');
            console.log('   To use Claude, install: npm install -g @anthropic-ai/claude-code');
            console.log('   Then authenticate: claude auth');
          }
          
          console.log('\n🔍 Debug Information:');
          console.log('   Error:', error.message);
          console.log('   Error Code:', error.code);
          console.log('   Error Signal:', error.signal);
          if (stdout) console.log('   STDOUT:', stdout);
          if (stderr) console.log('   STDERR:', stderr);
          
          resolve({
            success: false,
            error: `Claude execution failed: ${error.message}`,
            debugInfo: {
              executionError: error.message,
              stdout: stdout || 'none',
              stderr: stderr || 'none'
            }
          });
          return;
        }
        
        if (stderr) {
          console.error(`Claude stderr: ${stderr}`);
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
   * Check if Claude CLI is available without running enhancement
   */
  async isAvailable(): Promise<boolean> {
    const versionCheck = await this.checkClaudeVersion();
    if (!versionCheck.success) return false;
    
    const printCheck = await this.checkClaudePrint();
    return printCheck.success;
  }
}

// Export a default instance
export const claudeRunner = new ClaudeRunner(); 