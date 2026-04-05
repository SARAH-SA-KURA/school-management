const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const illustrations = [
  { nodeId: '244:28041', name: 'auth-login.png' },
  { nodeId: '244:28188', name: 'auth-forgot-password.png' },
  { nodeId: '244:28690', name: 'auth-email-verify.png' },
  { nodeId: '244:29910', name: 'auth-reset-password.png' },
  { nodeId: '244:31001', name: 'auth-reset-success.png' },
];

const outDir = path.join(__dirname, 'public', 'images');
const uuid = () => crypto.randomUUID();
let current = 0;

const ws = new WebSocket('ws://localhost:3055');

function exportNext() {
  if (current >= illustrations.length) {
    console.log('All illustrations exported!');
    ws.close();
    process.exit(0);
    return;
  }

  const item = illustrations[current];
  const id = uuid();
  console.log(`Exporting ${item.name} (${item.nodeId})...`);

  ws.send(JSON.stringify({
    id,
    type: 'message',
    channel: 'qnrxkd6i',
    message: {
      id,
      command: 'export_node_as_image',
      params: { nodeId: item.nodeId, format: 'PNG', scale: 1, commandId: id }
    }
  }));
}

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', channel: 'qnrxkd6i' }));
  setTimeout(() => exportNext(), 1000);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'broadcast' && msg.message && msg.message.result) {
    const result = msg.message.result;
    if (result.imageData) {
      const item = illustrations[current];
      const outPath = path.join(outDir, item.name);
      fs.writeFileSync(outPath, Buffer.from(result.imageData, 'base64'));
      console.log(`  Saved ${item.name} (${fs.statSync(outPath).size} bytes)`);
      current++;
      setTimeout(() => exportNext(), 500);
    }
  }
});

setTimeout(() => {
  console.log('Global timeout - exported', current, 'of', illustrations.length);
  ws.close();
  process.exit(current === illustrations.length ? 0 : 1);
}, 120000);
