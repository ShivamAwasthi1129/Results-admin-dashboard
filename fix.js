const fs = require('fs');
const p = 'src/app/dashboard/results-com-maintenance/ResultsComMaintenanceClient.tsx';
let c = fs.readFileSync(p, 'utf8');
// Replace doubled single quotes from PowerShell heredoc escaping
c = c.replace(/'{2}/g, "'");
fs.writeFileSync(p, c);
console.log('Done!');
