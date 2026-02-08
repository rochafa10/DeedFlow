const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const HOST = '192.241.153.13';
const USER = 'root';
const PASS = 'B@s@210614';

console.log('=== SSH Connection with Password ===\n');
console.log('[1] Connecting to', HOST, '...');

conn.on('ready', () => {
  console.log('[1] Connected!\n');

  // Add SSH key
  console.log('[2] Adding SSH key...');
  const cmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "SSH_KEY_ADDED"';

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err.message);
      conn.end();
      return;
    }

    let output = '';
    stream.on('data', (data) => { output += data.toString(); });
    stream.stderr.on('data', (data) => { output += data.toString(); });
    stream.on('close', () => {
      console.log('[2] Output:', output);

      if (output.includes('SSH_KEY_ADDED')) {
        console.log('[2] SSH key added successfully!\n');

        // Now deploy the script
        console.log('[3] Reading script file...');
        const scriptPath = path.join(__dirname, '..', 'scripts', 'regrid-screenshot-v17.js');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        console.log('[4] Creating script on server...');
        conn.exec('cat > /tmp/regrid-screenshot-v17.js << \'ENDOFSCRIPT\'\n' + scriptContent + '\nENDOFSCRIPT', (err2, stream2) => {
          if (err2) {
            console.error('Error:', err2.message);
            conn.end();
            return;
          }

          stream2.on('close', () => {
            console.log('[4] Script created on server\n');

            console.log('[5] Copying to pwrunner container...');
            conn.exec('docker cp /tmp/regrid-screenshot-v17.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v17.js && echo "DEPLOYED"', (err3, stream3) => {
              if (err3) {
                console.error('Error:', err3.message);
                conn.end();
                return;
              }

              let out3 = '';
              stream3.on('data', (d) => { out3 += d.toString(); });
              stream3.stderr.on('data', (d) => { out3 += d.toString(); });
              stream3.on('close', () => {
                console.log('[5] Output:', out3);

                if (out3.includes('DEPLOYED')) {
                  console.log('\n[6] Verifying deployment...');
                  conn.exec('docker exec n8n-production-pwrunner-1 head -20 /app/scripts/regrid-screenshot-v17.js', (err4, stream4) => {
                    if (err4) {
                      console.error('Error:', err4.message);
                      conn.end();
                      return;
                    }

                    let out4 = '';
                    stream4.on('data', (d) => { out4 += d.toString(); });
                    stream4.on('close', () => {
                      console.log('[6] Script header:');
                      console.log('---');
                      console.log(out4);
                      console.log('---');
                      console.log('\n========================================');
                      console.log('DEPLOYMENT COMPLETE!');
                      console.log('========================================');
                      conn.end();
                    });
                  });
                } else {
                  console.log('[5] Deployment may have failed');
                  conn.end();
                }
              });
            });
          });
        });
      } else {
        console.log('[2] SSH key addition may have failed');
        conn.end();
      }
    });
  });
});

conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  console.log('[1] Keyboard-interactive auth...');
  finish([PASS]);
});

conn.on('error', (err) => {
  console.error('Connection error:', err.message);
});

conn.connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS,
  tryKeyboard: true,
  readyTimeout: 30000
});
