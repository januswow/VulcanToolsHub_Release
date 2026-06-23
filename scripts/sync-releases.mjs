import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLatestRelease, localReleaseTools, mapRelease } from './release-sync-core.mjs';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = resolve(rootDir, 'public');
const outputPath = resolve(publicDir, 'releases.json');
const toolsOutputPath = resolve(publicDir, 'tools.json');

const releases = {};

for (const tool of localReleaseTools) {
  const release = await fetchLatestRelease(tool);
  releases[tool.id] = mapRelease(tool, release);
}

await mkdir(publicDir, { recursive: true });

const generatedAt = new Date().toISOString();
const releasePayload = {
  generatedAt,
  tools: releases,
};

const publicTools = localReleaseTools.map((tool) => ({
  id: tool.id,
  name: tool.name,
  category: 'local',
  latestRelease: releases[tool.id] || null,
}));

await writeFile(outputPath, `${JSON.stringify(releasePayload, null, 2)}\n`);
await writeFile(toolsOutputPath, `${JSON.stringify({ generatedAt, tools: publicTools }, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${toolsOutputPath}`);
