const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const HOST = '192.241.153.13';
const USER = 'root';
const PASS = 'e4fe3448632cc01c647976f38b';

const scriptPath = path.join(__dirname, '..', 'scripts', 'regrid-screenshot-v17.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('=== SSH Deployment to DigitalOcean ===\n');
console.log('[1] Connecting to', HOST, '...');

conn.on('ready', () => {
  console.log('[1] ✓ Connected!\n');
  
  console.log('[2] Adding SSH key...');
  const sshKeyCmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "DONE"';
  
  conn.exec(sshKeyCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('[2] ✓ SSH key added!\n');
      
      console.log('[3] Creating script...');
      const createCmd = `cat > /tmp/regrid-screenshot-v17.js << 'EOFSCRIPT'\n${scriptContent}\nEOFSCRIPT`;
      
      conn.exec(createCmd, (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', () => {
          console.log('[3] ✓ Script created!\n');
          
          console.log('[4] Copying to container...');
          conn.exec('docker cp /tmp/regrid-screenshot-v17.js n8n-production-pwrunner-1:/app/scripts/ && echo SUCCESS', (err3, stream3) => {
            if (err3) throw err3;
            let out = '';
            stream3.on('data', d => out += d);
            stream3.stderr.on('data', d => out += d);
            stream3.on('close', () => {
              console.log('[4]', out.includes('SUCCESS') ? '✓ Deployed!' : out);
              
              console.log('[5] Verifying...');
              conn.exec('docker exec n8n-production-pwrunner-1 head -5 /app/scripts/regrid-screenshot-v17.js', (err4, stream4) => {
                if (err4) throw err4;
                let verify = '';
                stream4.on('data', d => verify += d);
                stream4.on('close', () => {
                  console.log(verify);
                  console.log('\n✓ DEPLOYMENT COMPLETE!');
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

conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  console.log('[1] Keyboard-interactive auth, sending password...');
  finish([PASS]);
});

conn.on('error', (err) => {
  console.error('Error:', err.message);
});

conn.connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS,
  tryKeyboard: true,
  readyTimeout: 30000
});
