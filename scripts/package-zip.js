import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'geometric-traverse.zip');

const zip = new JSZip();

// Ignore patterns
const ignoreList = [
  'node_modules',
  '.git',
  '.cache',
  '.DS_Store',
  'geometric-traverse.zip'
];

function addFolderToZip(folderPath, zipFolder) {
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    if (ignoreList.includes(item)) continue;

    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const childZip = zipFolder.folder(item);
      if (childZip) {
        addFolderToZip(fullPath, childZip);
      }
    } else {
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

console.log('Packaging project into geometric-traverse.zip...');
addFolderToZip(rootDir, zip);

zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 }
}).then((content) => {
  fs.writeFileSync(outputFile, content);
  const sizeMB = (content.length / (1024 * 1024)).toFixed(2);
  console.log(`Successfully created geometric-traverse.zip (${sizeMB} MB) at ${outputFile}`);
}).catch((err) => {
  console.error('Failed to create zip:', err);
  process.exit(1);
});
