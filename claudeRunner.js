const { exec } = require('child_process');
const path = require('path');

function runClaude(promptPath) {
  const cmd = `claude --file "${promptPath}"`;
  const subprocess = exec(cmd);

  subprocess.stdout.on('data', (data) => process.stdout.write(data));
  subprocess.stderr.on('data', (data) => process.stderr.write(data));
}

module.exports = { runClaude };
