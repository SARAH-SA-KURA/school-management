const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ws = new WebSocket('ws://localhost:3055');
const uuid = () => crypto.randomUUID();
const outDir = 'C:/Users/BADR/Desktop/SchoolProject';

const pages = [
  { nodeId: '244:31746', name: 'figma_exam_schedule' },
  { nodeId: '244:36649', name: 'figma_emploi_admin' },
  { nodeId: '244:35291', name: 'figma_utilisateurs' },
  { nodeId: '244:35631', name: 'figma_parametres1' },
  { nodeId: '244:35923', name: 'figma_parametres2' },
  { nodeId: '244:36097', name: 'figma_parametres3' },
  { nodeId: '244:45518', name: 'figma_formateur_dashboard' },
  { nodeId: '244:45911', name: 'figma_formateur_modules' },
  { nodeId: '244:46285', name: 'figma_formateur_emploi' },
  { nodeId: '244:46735', name: 'figma_formateur_examens' },
  { nodeId: '244:47992', name: 'figma_formateur_absences' },
  { nodeId: '244:48801', name: 'figma_stagiaire_dashboard' },
  { nodeId: '244:49386', name: 'figma_stagiaire_modules' },
  { nodeId: '244:48351', name: 'figma_stagiaire_emploi' },
  { nodeId: '244:49063', name: 'figma_stagiaire_absences' },
  { nodeId: '244:50075', name: 'figma_stagiaire_examens' },
  { nodeId: '244:37031', name: 'figma_surveillant_exams' },
  { nodeId: '244:45040', name: 'figma_surveillant_emploi' },
];

let idx = 0;
let pending = null;

function exportNext() {
  if (idx >= pages.length) {
    console.log('All done!');
    ws.close();
    process.exit(0);
    return;
  }
  const p = pages[idx];
  const id = uuid();
  pending = { id, page: p };
  console.log(`[${idx+1}/${pages.length}] Exporting ${p.name} (${p.nodeId})...`);
  ws.send(JSON.stringify({
    id, type: 'message', channel: 'k07q59c1',
    message: { id, command: 'export_node_as_image', params: { nodeId: p.nodeId, format: 'PNG', scale: 1, commandId: id } }
  }));
}

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', channel: 'k07q59c1' }));
  setTimeout(exportNext, 1500);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'broadcast' && msg.message && !msg.message.command) {
    if (msg.message.result !== undefined && pending) {
      const result = msg.message.result;
      let b64 = null;
      if (typeof result === 'string' && result.length > 100) {
        b64 = result;
      } else if (result && result.imageData) {
        b64 = result.imageData;
      }
      if (b64) {
        const buf = Buffer.from(b64, 'base64');
        const filePath = path.join(outDir, pending.page.name + '.png');
        fs.writeFileSync(filePath, buf);
        console.log(`  Saved: ${filePath} (${(buf.length/1024).toFixed(1)}KB)`);
      } else {
        console.log(`  Result (no image): ${JSON.stringify(result).substring(0, 200)}`);
      }
      idx++;
      setTimeout(exportNext, 500);
    } else if (msg.message.error !== undefined) {
      console.log(`  Error: ${JSON.stringify(msg.message.error)}`);
      idx++;
      setTimeout(exportNext, 500);
    }
  }
});

setTimeout(() => { console.log('GLOBAL TIMEOUT'); ws.close(); process.exit(1); }, 300000);
