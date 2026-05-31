import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  IconTransformationType,
  initFaviconIconSettings,
  generateFaviconFiles,
  generateFaviconHtml,
} from '@realfavicongenerator/generate-favicon';
import {
  getNodeImageAdapter,
  loadAndConvertToSvg,
} from '@realfavicongenerator/image-adapter-node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourceSvg = join(__dirname, 'source-icon.svg');
const outDir = join(projectRoot, 'public');

const BG = '#0f172a';
const THEME = '#4f46e5';

await mkdir(outDir, { recursive: true });

const imageAdapter = await getNodeImageAdapter();
const masterIcon = { icon: await loadAndConvertToSvg(sourceSvg) };

const icon = initFaviconIconSettings();

icon.desktop.regularIconTransformation = {
  type: IconTransformationType.None,
  backgroundRadius: 0,
  backgroundColor: BG,
  imageScale: 1,
  brightness: 0,
};
icon.desktop.darkIconType = 'none';

icon.touch.transformation = {
  type: IconTransformationType.None,
  backgroundRadius: 0,
  backgroundColor: BG,
  imageScale: 1,
  brightness: 0,
};
icon.touch.appTitle = 'Inventory';

icon.webAppManifest.transformation = {
  type: IconTransformationType.None,
  backgroundRadius: 0,
  backgroundColor: BG,
  imageScale: 1,
  brightness: 0,
};
icon.webAppManifest.name = 'Inventory System';
icon.webAppManifest.shortName = 'Inventory';
icon.webAppManifest.backgroundColor = BG;
icon.webAppManifest.themeColor = THEME;

const settings = { icon, path: '/' };

console.log('Generating favicon files…');
const files = await generateFaviconFiles(masterIcon, settings, imageAdapter);

for (const [name, content] of Object.entries(files)) {
  const dest = join(outDir, name);
  await mkdir(dirname(dest), { recursive: true });
  const data = typeof content === 'string' ? content : Buffer.from(content);
  await writeFile(dest, data);
  console.log('  •', name);
}

const html = generateFaviconHtml(settings);
console.log('\n--- HTML markup ---');
console.log(html.markups.join('\n'));

await writeFile(join(__dirname, 'favicon-markup.html'), html.markups.join('\n'));
