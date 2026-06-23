import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyAsset,
  fetchLatestRelease,
  localReleaseTools,
  mapRelease,
  releaseAssetsRepo,
  releaseAssetsTag,
} from './release-sync-core.mjs';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = resolve(rootDir, 'public');

function githubHeaders(token, accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': 'vulcan-tools-hub-release-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getRequiredToken() {
  const token = process.env.RELEASE_SYNC_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('RELEASE_SYNC_TOKEN or GITHUB_TOKEN is required');
  }

  return token;
}

function getPublicReleaseToken(sourceToken) {
  return process.env.RELEASE_ASSETS_TOKEN || sourceToken;
}

function uploadUrlForRelease(release, assetName) {
  const baseUrl = String(release.upload_url || '').replace(/\{.*$/, '');
  if (!baseUrl) {
    throw new Error(`Release ${release.tag_name || release.id} is missing upload_url`);
  }

  return `${baseUrl}?name=${encodeURIComponent(assetName)}`;
}

async function githubJson(url, { method = 'GET', token, body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      ...githubHeaders(token),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`${method} ${url} failed with HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function ensurePublicRelease({
  repo = releaseAssetsRepo,
  tagName = releaseAssetsTag,
  token,
  fetchImpl = fetch,
} = {}) {
  const releaseUrl = `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tagName)}`;
  const response = await fetchImpl(releaseUrl, {
    headers: githubHeaders(token),
  });

  if (response.ok) {
    return response.json();
  }

  if (response.status !== 404) {
    throw new Error(`${repo} release ${tagName} request failed with HTTP ${response.status}`);
  }

  return githubJson(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    token,
    fetchImpl,
    body: {
      tag_name: tagName,
      name: 'VulcanToolsHub Latest Downloads',
      body: 'Latest desktop download files mirrored for VulcanToolsHub.',
      draft: false,
      prerelease: false,
    },
  });
}

export function verifyAssetDigest(asset, bytes) {
  if (!asset.digest) {
    throw new Error(`${asset.name} is missing sha256 digest`);
  }

  const expectedDigest = String(asset.digest).toLowerCase();
  if (!expectedDigest.startsWith('sha256:')) {
    throw new Error(`${asset.name} has unsupported digest format`);
  }

  const actualDigest = `sha256:${createHash('sha256').update(Buffer.from(bytes)).digest('hex')}`;
  if (actualDigest !== expectedDigest) {
    throw new Error(`${asset.name} digest mismatch: expected ${expectedDigest}, got ${actualDigest}`);
  }
}

export function collectRequiredAssets(tool, release) {
  const selectedAssets = [];

  for (const asset of release.assets || []) {
    if (classifyAsset(asset.name)) {
      selectedAssets.push({ tool, release, asset });
    }
  }

  for (const requiredPlatform of ['macos', 'windows-portable']) {
    if (!selectedAssets.some(({ asset }) => classifyAsset(asset.name) === requiredPlatform)) {
      throw new Error(`${tool.repo} ${release.tag_name} is missing required ${requiredPlatform} asset`);
    }
  }

  return selectedAssets;
}

export async function deletePublicReleaseAssets({ repo = releaseAssetsRepo, release, token, fetchImpl = fetch }) {
  for (const asset of release.assets || []) {
    await githubJson(`https://api.github.com/repos/${repo}/releases/assets/${asset.id}`, {
      method: 'DELETE',
      token,
      fetchImpl,
    });
  }
}

export async function downloadSourceAsset({ asset, token, fetchImpl = fetch }) {
  const sourceUrl = asset.url || asset.apiUrl || asset.browser_download_url;
  if (!sourceUrl) {
    throw new Error(`${asset.name} is missing a download URL`);
  }

  const response = await fetchImpl(sourceUrl, {
    headers: githubHeaders(token, 'application/octet-stream'),
  });

  if (!response.ok) {
    throw new Error(`${asset.name} download failed with HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  verifyAssetDigest(asset, bytes);
  return bytes;
}

export async function uploadPublicReleaseAsset({
  release,
  asset,
  bytes,
  token,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(uploadUrlForRelease(release, asset.name), {
    method: 'POST',
    headers: {
      ...githubHeaders(token),
      'Content-Type': asset.content_type || asset.contentType || 'application/octet-stream',
      'Content-Length': String(bytes.length),
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new Error(`${asset.name} upload failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function writeReleasePayloads(releases) {
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

  await writeFile(resolve(publicDir, 'releases.json'), `${JSON.stringify(releasePayload, null, 2)}\n`);
  await writeFile(resolve(publicDir, 'tools.json'), `${JSON.stringify({ generatedAt, tools: publicTools }, null, 2)}\n`);
}

export async function syncReleaseAssets({
  token = getRequiredToken(),
  publicToken = getPublicReleaseToken(token),
  fetchImpl = fetch,
} = {}) {
  const releases = {};
  const assetsToMirror = [];

  for (const tool of localReleaseTools) {
    const release = await fetchLatestRelease(tool, fetchImpl);
    releases[tool.id] = mapRelease(tool, release);
    assetsToMirror.push(...collectRequiredAssets(tool, release));
  }

  const verifiedAssets = [];
  for (const { asset } of assetsToMirror) {
    verifiedAssets.push({
      asset,
      bytes: await downloadSourceAsset({ asset, token, fetchImpl }),
    });
  }

  const publicRelease = await ensurePublicRelease({ token: publicToken, fetchImpl });
  await deletePublicReleaseAssets({ release: publicRelease, token: publicToken, fetchImpl });

  for (const { asset, bytes } of verifiedAssets) {
    await uploadPublicReleaseAsset({ release: publicRelease, asset, bytes, token: publicToken, fetchImpl });
  }

  await writeReleasePayloads(releases);

  return {
    release: publicRelease,
    mirroredAssetCount: assetsToMirror.length,
    tools: Object.keys(releases),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await syncReleaseAssets();
  console.log(`Synced ${result.mirroredAssetCount} assets to ${releaseAssetsRepo} ${releaseAssetsTag}`);
  console.log(`Wrote ${resolve(publicDir, 'releases.json')}`);
  console.log(`Wrote ${resolve(publicDir, 'tools.json')}`);
}
