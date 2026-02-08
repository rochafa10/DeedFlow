const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const HOST = '192.241.153.13';
const USER = 'root';
const PASS = 'e4fe3448632cc01c647976f38b';

// Read the script to deploy
const scriptPath = path.join(__dirname, '..', 'scripts', 'regrid-screenshot-v17.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('=== SSH Deployment to DigitalOcean ===\n');
console.log('[1] Connecting to', HOST, '...');

conn.on('ready', () => {
  console.log('[1] ✓ Connected!\n');
  
  // First, add SSH key for future access
  const sshKeyCmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "SSH_KEY_ADDED"';
  
  console.log('[2] Adding SSH key for future access...');
  conn.exec(sshKeyCmd, (err, stream) => {
    if (err) {
      console.error('[2] Error:', err.message);
      conn.end();
      return;
    }
    
    let output = '';
    stream.on('data', (data) => { output += data.toString(); });
    stream.on('close', () => {
      if (output.includes('SSH_KEY_ADDED')) {
        console.log('[2] ✓ SSH key added!\n');
      } else {
        console.log('[2] SSH key output:', output);
      }
      
      // Now deploy the script
      console.log('[3] Creating script on server...');
      
      // Escape the script content for shell
      const escapedScript = scriptContent.replace(/'/g, "'\''");
      const deployCmd = `cat > /tmp/regrid-screenshot-v17.js << 'EOFSCRIPT'
${scriptContent}
EOFSCRIPT
echo "SCRIPT_CREATED"`;
      
      conn.exec(deployCmd, (err2, stream2) => {
        if (err2) {
          console.error('[3] Error:', err2.message);
          conn.end();
          return;
        }
        
        let output2 = '';
        stream2.on('data', (data) => { output2 += data.toString(); });
        stream2.on('close', () => {
          if (output2.includes('SCRIPT_CREATED')) {
            console.log('[3] ✓ Script created at /tmp/regrid-screenshot-v17.js\n');
          } else {
            console.log('[3] Output:', output2);
          }
          
          // Copy to container
          console.log('[4] Copying to pwrunner container...');
          const copyCmd = 'docker cp /tmp/regrid-screenshot-v17.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v17.js && echo "COPY_SUCCESS"';
          
          conn.exec(copyCmd, (err3, stream3) => {
            if (err3) {
              console.error('[4] Error:', err3.message);
              conn.end();
              return;
            }
            
            let output3 = '';
            stream3.on('data', (data) => { output3 += data.toString(); });
            stream3.stderr.on('data', (data) => { output3 += data.toString(); });
            stream3.on('close', () => {
              if (output3.includes('COPY_SUCCESS')) {
                console.log('[4] ✓ Script deployed to container!\n');
              } else {
                console.log('[4] Output:', output3);
              }
              
              // Verify
              console.log('[5] Verifying deployment...');
              const verifyCmd = 'docker exec n8n-production-pwrunner-1 head -25 /app/scripts/regrid-screenshot-v17.js';
              
              conn.exec(verifyCmd, (err4, stream4) => {
                if (err4) {
                  console.error('[5] Error:', err4.message);
                  conn.end();
                  return;
                }
                
                let output4 = '';
                stream4.on('data', (data) => { output4 += data.toString(); });
                stream4.on('close', () => {
                  console.log('[5] Script header in container:');
                  console.log('---');
                  console.log(output4.substring(0, 500));
                  console.log('---\n');
                  
                  console.log('========================================');
                  console.log('✓ DEPLOYMENT COMPLETE!');
                  console.log('========================================');
                  conn.end();
                });
              });
            });
          });
        });
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('Connection error:', err.message);
});

conn.connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS
});
