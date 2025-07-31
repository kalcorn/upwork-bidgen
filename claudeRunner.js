const { exec } = require('child_process');
const fs = require('fs');

function runClaude(promptPath) {
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

  const cmd = 'claude --print';
  const subprocess = exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running Claude: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Claude stderr: ${stderr}`);
    }
    console.log('\n🤖 Enhanced proposal from Claude:');
    console.log('═'.repeat(50));
    console.log(stdout);
    console.log('═'.repeat(50));
  });

  // Pass the prompt via stdin
  subprocess.stdin.write(enhancementPrompt);
  subprocess.stdin.end();
}

module.exports = { runClaude };
