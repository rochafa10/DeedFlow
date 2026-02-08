/**
 * DigitalOcean API Utility
 *
 * Usage:
 *   node digitalocean-api.js <command> [options]
 *
 * Commands:
 *   droplets              - List all droplets
 *   droplet <id>          - Get droplet details
 *   reboot <id>           - Reboot a droplet
 *   poweroff <id>         - Power off a droplet
 *   poweron <id>          - Power on a droplet
 *   snapshot <id> <name>  - Create snapshot
 *   domains               - List all domains
 *   dns <domain>          - List DNS records for domain
 *   billing               - Get billing info
 *   ssh-keys              - List SSH keys
 *   firewalls             - List firewalls
 *
 * Environment:
 *   DIGITALOCEAN_TOKEN    - Your DO API token (required)
 */

const https = require('https');

const API_BASE = 'api.digitalocean.com';
const TOKEN = process.env.DIGITALOCEAN_TOKEN;

if (!TOKEN) {
  console.error('Error: DIGITALOCEAN_TOKEN environment variable is required');
  console.error('Set it with: export DIGITALOCEAN_TOKEN="dop_v1_xxxxx"');
  process.exit(1);
}

// Helper function to make API requests
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: 443,
      path: `/v2${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, ...json });
          } else {
            resolve(json);
          }
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Command handlers
const commands = {
  async droplets() {
    const data = await apiRequest('GET', '/droplets');
    console.log('\nDROPLETS');
    console.log('========');
    if (!data.droplets || data.droplets.length === 0) {
      console.log('No droplets found');
      return;
    }
    data.droplets.forEach(d => {
      console.log(`\n${d.name} (ID: ${d.id})`);
      console.log(`  Status: ${d.status}`);
      console.log(`  IP: ${d.networks.v4.find(n => n.type === 'public')?.ip_address || 'N/A'}`);
      console.log(`  Region: ${d.region.slug}`);
      console.log(`  Size: ${d.size_slug} (${d.memory}MB RAM, ${d.vcpus} vCPU, ${d.disk}GB)`);
      console.log(`  Image: ${d.image.name}`);
      console.log(`  Created: ${d.created_at}`);
    });
  },

  async droplet(id) {
    if (!id) {
      console.error('Usage: droplet <droplet_id>');
      return;
    }
    const data = await apiRequest('GET', `/droplets/${id}`);
    const d = data.droplet;
    console.log('\nDROPLET DETAILS');
    console.log('===============');
    console.log(`Name: ${d.name}`);
    console.log(`ID: ${d.id}`);
    console.log(`Status: ${d.status}`);
    console.log(`IP: ${d.networks.v4.find(n => n.type === 'public')?.ip_address || 'N/A'}`);
    console.log(`Private IP: ${d.networks.v4.find(n => n.type === 'private')?.ip_address || 'N/A'}`);
    console.log(`Region: ${d.region.name} (${d.region.slug})`);
    console.log(`Size: ${d.size_slug}`);
    console.log(`Memory: ${d.memory}MB`);
    console.log(`vCPUs: ${d.vcpus}`);
    console.log(`Disk: ${d.disk}GB`);
    console.log(`Image: ${d.image.name} (${d.image.distribution})`);
    console.log(`Created: ${d.created_at}`);
    console.log(`Tags: ${d.tags.join(', ') || 'none'}`);
    console.log(`Backups: ${d.backup_ids.length > 0 ? d.backup_ids.join(', ') : 'none'}`);
    console.log(`Snapshots: ${d.snapshot_ids.length > 0 ? d.snapshot_ids.join(', ') : 'none'}`);
  },

  async reboot(id) {
    if (!id) {
      console.error('Usage: reboot <droplet_id>');
      return;
    }
    console.log(`Rebooting droplet ${id}...`);
    const data = await apiRequest('POST', `/droplets/${id}/actions`, { type: 'reboot' });
    console.log(`Action ID: ${data.action.id}`);
    console.log(`Status: ${data.action.status}`);
    console.log('Reboot initiated. Check status with: droplet <id>');
  },

  async poweroff(id) {
    if (!id) {
      console.error('Usage: poweroff <droplet_id>');
      return;
    }
    console.log(`Powering off droplet ${id}...`);
    const data = await apiRequest('POST', `/droplets/${id}/actions`, { type: 'power_off' });
    console.log(`Action ID: ${data.action.id}`);
    console.log(`Status: ${data.action.status}`);
  },

  async poweron(id) {
    if (!id) {
      console.error('Usage: poweron <droplet_id>');
      return;
    }
    console.log(`Powering on droplet ${id}...`);
    const data = await apiRequest('POST', `/droplets/${id}/actions`, { type: 'power_on' });
    console.log(`Action ID: ${data.action.id}`);
    console.log(`Status: ${data.action.status}`);
  },

  async snapshot(id, name) {
    if (!id || !name) {
      console.error('Usage: snapshot <droplet_id> <snapshot_name>');
      return;
    }
    console.log(`Creating snapshot "${name}" for droplet ${id}...`);
    const data = await apiRequest('POST', `/droplets/${id}/actions`, {
      type: 'snapshot',
      name: name
    });
    console.log(`Action ID: ${data.action.id}`);
    console.log(`Status: ${data.action.status}`);
    console.log('Snapshot creation initiated. This may take several minutes.');
  },

  async domains() {
    const data = await apiRequest('GET', '/domains');
    console.log('\nDOMAINS');
    console.log('=======');
    if (!data.domains || data.domains.length === 0) {
      console.log('No domains found');
      return;
    }
    data.domains.forEach(d => {
      console.log(`\n${d.name}`);
      console.log(`  TTL: ${d.ttl}`);
      console.log(`  Zone File: ${d.zone_file ? 'present' : 'none'}`);
    });
  },

  async dns(domain) {
    if (!domain) {
      console.error('Usage: dns <domain>');
      return;
    }
    const data = await apiRequest('GET', `/domains/${domain}/records`);
    console.log(`\nDNS RECORDS FOR ${domain}`);
    console.log('='.repeat(20 + domain.length));
    if (!data.domain_records || data.domain_records.length === 0) {
      console.log('No records found');
      return;
    }
    data.domain_records.forEach(r => {
      const name = r.name === '@' ? domain : `${r.name}.${domain}`;
      console.log(`\n${r.type} ${name}`);
      console.log(`  Data: ${r.data}`);
      console.log(`  TTL: ${r.ttl}`);
      console.log(`  ID: ${r.id}`);
      if (r.priority) console.log(`  Priority: ${r.priority}`);
    });
  },

  async billing() {
    const data = await apiRequest('GET', '/customers/my/balance');
    console.log('\nBILLING');
    console.log('=======');
    console.log(`Month-to-Date Balance: $${data.month_to_date_balance}`);
    console.log(`Account Balance: $${data.account_balance}`);
    console.log(`Month-to-Date Usage: $${data.month_to_date_usage}`);
    console.log(`Generated At: ${data.generated_at}`);
  },

  async 'ssh-keys'() {
    const data = await apiRequest('GET', '/account/keys');
    console.log('\nSSH KEYS');
    console.log('========');
    if (!data.ssh_keys || data.ssh_keys.length === 0) {
      console.log('No SSH keys found');
      return;
    }
    data.ssh_keys.forEach(k => {
      console.log(`\n${k.name}`);
      console.log(`  ID: ${k.id}`);
      console.log(`  Fingerprint: ${k.fingerprint}`);
      console.log(`  Public Key: ${k.public_key.substring(0, 50)}...`);
    });
  },

  async firewalls() {
    const data = await apiRequest('GET', '/firewalls');
    console.log('\nFIREWALLS');
    console.log('=========');
    if (!data.firewalls || data.firewalls.length === 0) {
      console.log('No firewalls found');
      return;
    }
    data.firewalls.forEach(f => {
      console.log(`\n${f.name} (ID: ${f.id})`);
      console.log(`  Status: ${f.status}`);
      console.log(`  Droplets: ${f.droplet_ids.join(', ') || 'none'}`);
      console.log(`  Inbound Rules: ${f.inbound_rules.length}`);
      console.log(`  Outbound Rules: ${f.outbound_rules.length}`);
    });
  },

  async help() {
    console.log(`
DigitalOcean API Utility
========================

Commands:
  droplets              - List all droplets
  droplet <id>          - Get droplet details
  reboot <id>           - Reboot a droplet
  poweroff <id>         - Power off a droplet
  poweron <id>          - Power on a droplet
  snapshot <id> <name>  - Create snapshot
  domains               - List all domains
  dns <domain>          - List DNS records for domain
  billing               - Get billing info
  ssh-keys              - List SSH keys
  firewalls             - List firewalls
  help                  - Show this help

Environment:
  DIGITALOCEAN_TOKEN    - Your DO API token (required)

Examples:
  node digitalocean-api.js droplets
  node digitalocean-api.js droplet 123456789
  node digitalocean-api.js reboot 123456789
  node digitalocean-api.js snapshot 123456789 "backup-2026-01-25"
  node digitalocean-api.js dns example.com
`);
  }
};

// Main execution
async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await commands.help();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with "help" to see available commands');
    process.exit(1);
  }

  try {
    await handler(...args);
  } catch (error) {
    console.error('\nAPI Error:');
    if (error.status) {
      console.error(`  Status: ${error.status}`);
    }
    if (error.message) {
      console.error(`  Message: ${error.message}`);
    }
    if (error.id) {
      console.error(`  Error ID: ${error.id}`);
    }
    process.exit(1);
  }
}

main();
