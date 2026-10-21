const fs = require('fs');
const path = require('path');
fs.copyFileSync(path.join(__dirname, '..', 'openapi.yaml'), path.join(__dirname, '..', 'dist', 'openapi.yaml'));
