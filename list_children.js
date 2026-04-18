const WebSocket = require('ws');
const crypto = require('crypto');
const ws = new WebSocket('ws://localhost:3055');
const uuid = () => crypto.randomUUID();
const nodeId = process.argv[2] || '244:31745';

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', channel: 'k07q59c1' }));
  setTimeout(() => {
    const id = uuid();
    ws.send(JSON.stringify({
      id, type: 'message', channel: 'k07q59c1',
      message: { id, command: 'get_node_info', params: { nodeId, commandId: id } }
    }));
  }, 1000);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'broadcast' && msg.message) {
    if (msg.message.command) return;
    if (msg.message.result !== undefined) {
      const r = msg.message.result;
      if (r.children) {
        r.children.forEach(c => console.log(`${c.id} | ${c.name} | ${c.type}`));
      }
      ws.close();
      process.exit(0);
    }
  }
});

setTimeout(() => { ws.close(); process.exit(1); }, 30000);
