const WebSocket = require('ws');
const crypto = require('crypto');
const ws = new WebSocket('ws://localhost:3055');
const uuid = () => crypto.randomUUID();

const commandName = process.argv[2] || 'get_document_info';
const paramsArg = process.argv[3] ? JSON.parse(process.argv[3]) : {};

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', channel: '03d6tb0y' }));

  setTimeout(() => {
    const id = uuid();
    const msg = {
      id: id,
      type: 'message',
      channel: '03d6tb0y',
      message: {
        id: id,
        command: commandName,
        params: { ...paramsArg, commandId: id }
      }
    };
    ws.send(JSON.stringify(msg));
    console.error('SENT:', commandName, 'id:', id);
  }, 1000);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  console.error('MSG type:', msg.type, '| sender:', msg.sender || 'N/A');

  if (msg.type === 'broadcast' && msg.message) {
    // Skip echo of our own command
    if (msg.message.command) {
      console.error('  -> echo of our command, skip');
      return;
    }
    // Response from Figma plugin
    if (msg.message.result !== undefined || msg.message.error !== undefined) {
      // Output result to stdout (clean JSON)
      console.log(JSON.stringify(msg.message.result || msg.message.error, null, 2));
      ws.close();
      process.exit(0);
    }
    console.error('  -> other broadcast:', JSON.stringify(msg.message).substring(0, 200));
  }
});

setTimeout(() => {
  console.error('TIMEOUT - no response from Figma plugin after 15s');
  ws.close();
  process.exit(1);
}, 30000);
