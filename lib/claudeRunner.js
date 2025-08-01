const { exec } = require('child_process');
const fs = require('fs');

function runClaude(promptPath) {
  return new Promise((resolve, reject) => {
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

      // Check if Claude CLI is available
      const { exec } = require('child_process');
      
      // First, check if claude command exists and works properly
      console.log('🔍 Checking if Claude CLI is available...');
      exec('claude --version', (versionError, versionStdout, versionStderr) => {
      if (versionError) {
        console.log('⚠️ Claude CLI not found. Please install it first:');
        console.log('   npm install -g @anthropic-ai/claude-code');
        console.log('   Then authenticate with: claude auth');
        console.log('\n📝 Proposal saved without Claude enhancement.');
        console.log('\n🔍 Version Check Debug:');
        console.log('   Error:', versionError.message);
        console.log('   Error Code:', versionError.code);
        if (versionStdout) console.log('   STDOUT:', versionStdout);
        if (versionStderr) console.log('   STDERR:', versionStderr);
        resolve();
        return;
      }
      
      console.log('✅ Claude CLI found:', versionStdout?.trim() || 'Version info available');
      
      // Test if claude --print works
      console.log('🔍 Testing Claude --print functionality...');
      exec('claude --print --help', (printError, printStdout, printStderr) => {
        if (printError) {
          console.log('⚠️ Claude CLI found but --print option not available.');
          console.log('   Please ensure you have the latest version: npm install -g @anthropic-ai/claude-code');
          console.log('   Then authenticate with: claude auth');
          console.log('\n📝 Proposal saved without Claude enhancement.');
          console.log('\n🔍 Print Check Debug:');
          console.log('   Error:', printError.message);
          console.log('   Error Code:', printError.code);
          if (printStdout) console.log('   STDOUT:', printStdout);
          if (printStderr) console.log('   STDERR:', printStderr);
          resolve();
          return;
        }
        
        console.log('✅ Claude --print functionality confirmed');
        
                 // If both checks pass, try to enhance the proposal
         const cmd = 'claude --print';
         console.log('🔍 Attempting to run Claude with command:', cmd);
         
         const subprocess = exec(cmd, (error, stdout, stderr) => {
           if (error) {
             // Check for specific error types
             if (stdout && stdout.includes('usage limit reached')) {
               console.log('⚠️ Claude usage limit reached. Proposal saved without AI enhancement.');
               console.log('   This is a rate limit from Anthropic. Try again later or use ChatGPT/Gemini options.');
               if (stdout.includes('|')) {
                 const timestamp = stdout.split('|')[1];
                 const resetDate = new Date(parseInt(timestamp) * 1000);
                 console.log(`   Limit resets around: ${resetDate.toLocaleString()}`);
               }
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
             resolve();
             return;
           }
           if (stderr) {
             console.error(`Claude stderr: ${stderr}`);
           }
           console.log('\n🤖 Enhanced proposal from Claude:');
           console.log('═'.repeat(50));
           console.log(stdout);
           console.log('═'.repeat(50));
           resolve();
         });

        // Pass the prompt via stdin
        subprocess.stdin.write(enhancementPrompt);
        subprocess.stdin.end();
      });
    });
    
  } catch (error) {
    console.error(`Error reading proposal file: ${error.message}`);
    console.log('📝 Proposal saved without Claude enhancement.');
    resolve();
  }
  });
}

module.exports = { runClaude };
