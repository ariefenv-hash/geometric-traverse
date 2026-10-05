import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'geometric-traverse.zip');
// Second copy into public/ so `vite build` ships it and the in-game
// "Download ZIP" link (href="geometric-traverse.zip") actually resolves.
const publicOutputFile = path.join(rootDir, 'public', 'geometric-traverse.zip');

const zip = new JSZip();

// Ignore patterns
const ignoreList = [
  'node_modules',
  '.git',
  '.cache',
  '.DS_Store',
  'geometric-traverse.zip',
  // Build artifacts & previous release bundles — zipping these bloated the
  // archive with ~800 KB of stale content (zip-inside-zip, old dist).
  'dist',
  'build',
  'releases',
  'public',
  'bun.lock',
  // Local env files carry secrets (the project depends on dotenv); the
  // packager never read .gitignore, so a real .env would leak into the zip.
  '.env',
  '.env.local',
  '.env.production'
];

function addFolderToZip(folderPath, zipFolder) {
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    if (ignoreList.includes(item)) continue;
    if (item.startsWith('.env.')) continue;

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

  // Mirror into public/ for the deployed download button
  try {
    fs.mkdirSync(path.dirname(publicOutputFile), { recursive: true });
    fs.writeFileSync(publicOutputFile, content);
    console.log(`Copied to ${publicOutputFile} (served by vite build)`);
  } catch (err) {
    console.warn('Could not copy zip into public/:', err.message);
  }
}).catch((err) => {
  console.error('Failed to create zip:', err);
  process.exit(1);
});
