// src/runners/GeminiRunner.ts - Gemini CLI integration for proposal enhancement
import { exec, ExecException } from 'child_process';
import { JobData } from '../core/UpWorkAPI';
import { AIGenerator } from '../types/AIGenerator'; // New import

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

export class GeminiRunner implements AIGenerator { // Added implements AIGenerator
  private model: string; // New property to store the model
  // private _options: Required<GeminiRunnerOptions>; // Unused

  constructor(model: string = 'gemini-pro', _options: GeminiRunnerOptions = {}) {
    this.model = model;
    // Options are currently unused but kept for future use
  }

  /**
   * Enhance a proposal using Gemini CLI
   */
  async generateProposalFromTemplate(jobData: JobData, templateContent: string): Promise<GeminiEnhancementResult> {
    try {
      // Create a detailed prompt for Gemini to generate a proposal
      const generationPrompt = `Please act as an expert proposal writer. Your task is to generate a compelling and personalized UpWork proposal.

Here is the job data:
- **Job Title:** ${jobData.title}
- **Job Description:** ${jobData.description}
- **Experience Level:** ${jobData.experienceLevel}
- **Skills:** ${jobData.classification?.skills?.join(', ')}

Here is the proposal template to use as a style guide and structure:
--- TEMPLATE ---
${templateContent}
--- END TEMPLATE ---

Please generate a complete proposal that:
1.  Uses the tone and structure of the provided template.
2.  Is highly personalized to the job data.
3.  Fills in any placeholders like [Job Title] or [Key Outcome or Problem — 3–7 words] with relevant information derived from the job data.
4.  Is ready to be sent to the client.`;

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
      
      const result = await this.executeGemini(cmd, generationPrompt);
      
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
    // Construct the command with the specified model
    const fullCmd = `${cmd} --model ${this.model}`;
    return new Promise((resolve) => {
      const subprocess = exec(fullCmd, (error: ExecException | null, stdout: string, stderr: string) => {
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
   * Generate answers for screening questions using Gemini
   */
  async generateScreeningAnswers(
    jobData: JobData,
    questions: Array<{id?: string, question?: string, required?: boolean}>
  ): Promise<{success: boolean, answers?: Array<{question: string, answer: string}>, error?: string}> {
    if (questions.length === 0) {
      return { success: true, answers: [] };
    }

    const title = jobData.title || jobData.content?.title || 'this project';
    const description = jobData.description || jobData.content?.description || '';
    const skills = jobData.classification?.skills?.join(', ') || 'the required skills';

    const prompt = `You are a senior software architect applying for an UpWork project. Generate professional, specific answers for these screening questions.

Job Title: ${title}
Job Description: ${description.substring(0, 500)}...
Required Skills: ${skills}

Please answer each question professionally and specifically based on the job requirements. For Yes/No questions, give "Yes" or "No" followed by a brief explanation. For open-ended questions, provide detailed, relevant responses that demonstrate expertise.

Screening Questions:
${questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Format your response as:
Q1: [your answer]
Q2: [your answer]
etc.`;

    try {
      const result = await this.executeGemini('gemini', prompt);
      if (!result.success) {
        // Fix for Error 1: Ensure error is a string if present
        return { success: false, error: result.error ? result.error : 'Unknown error from Gemini' };
      }

      // Fix for Error 2: Use enhancedContent instead of response
      const responseText = result.enhancedContent || '';
      const answers: Array<{question: string, answer: string}> = [];
      
      const lines = responseText.split('\n');
      let currentAnswer = '';
      let currentQuestionIndex = -1;

      for (const line of lines) {
        const qMatch = line.match(/^Q(\d+):\s*(.+)$/);
        if (qMatch) {
          // Save previous answer if exists
          if (currentQuestionIndex >= 0 && currentAnswer.trim()) {
            answers.push({
              question: questions[currentQuestionIndex]?.question || '',
              answer: currentAnswer.trim()
            });
          }
          
          // Start new answer
          currentQuestionIndex = parseInt(qMatch[1]!) - 1; // Use non-null assertion
          currentAnswer = qMatch[2]!; // Use non-null assertion
        } else if (currentQuestionIndex >= 0) {
          // Continue current answer
          currentAnswer += '\n' + line;
        }
      }

      // Don't forget the last answer
      if (currentQuestionIndex >= 0 && currentAnswer.trim()) {
        answers.push({
          question: questions[currentQuestionIndex]?.question || '',
          answer: currentAnswer.trim()
        });
      }

      return { success: true, answers };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating screening answers'
      };
    }
  }

  /**
   * Check if Gemini CLI is available without running enhancement
   */
  async isAvailable(): Promise<boolean> {
    const versionCheck = await this.checkGeminiVersion();
    return versionCheck.success; // Only check version
  }
}

// Export a default instance
export const geminiRunner = new GeminiRunner(); 