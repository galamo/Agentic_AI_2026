import { execSync, spawn } from 'child_process';

// Run echo test command (synchronous)
console.log('Running echo test command...\n');

try {
  const result = execSync('echo "Hello from command line!"', { encoding: 'utf-8' });
  console.log('Output:', result.trim());
} catch (err) {
  console.error('Error:', err.message);
}

// Alternative: spawn for more control (async)
const child = spawn('node lab_8_SQL_FULL_ACCESS/mcp-server/server-stdio.js', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PG_HOST: "TEST_HOST"
  }
});

child.on('close', (code) => {
  console.log('\nProcess exited with code', code);
});
