export const localReleaseTools = [
  {
    id: 'spine-atlas-duplicator',
    name: 'Spine Atlas Duplicator',
    repo: 'januswow/SpineAtlasDuplicator',
  },
  {
    id: 'file-sync-tool',
    name: 'File Sync Tool',
    repo: 'januswow/FileSyncTool',
  },
  {
    id: 'spine-downgrade-tool',
    name: 'Spine Downgrade Tool',
    repo: 'januswow/SpineDowngradeTool',
  },
];

export const releaseAssetsRepo = 'januswow/VulcanToolsHub_Release';
export const releaseAssetsTag = 'vulcan-tools-latest';

export function getPublicReleaseAssetUrl(assetName) {
  return `https://github.com/${releaseAssetsRepo}/releases/download/${releaseAssetsTag}/${encodeURIComponent(assetName)}`;
}

export function normalizeVersion(tagName) {
  return String(tagName || '').replace(/^v/i, '');
}

export function classifyAsset(assetName) {
  if (/-mac-arm64\.zip$/i.test(assetName)) {
    return 'macos';
  }

  if (/-win-x64-portable\.exe$/i.test(assetName)) {
    return 'windows-portable';
  }

  return null;
}

export function mapRelease(tool, release) {
  const downloads = {};
  const version = normalizeVersion(release.tag_name);

  for (const asset of release.assets || []) {
    const platform = classifyAsset(asset.name);
    if (!platform) {
      continue;
    }

    downloads[platform] = {
      platform,
      name: asset.name,
      url: getPublicReleaseAssetUrl(asset.name),
      size: asset.size,
      digest: asset.digest || null,
      contentType: asset.content_type || null,
    };
  }

  for (const requiredPlatform of ['macos', 'windows-portable']) {
    if (!downloads[requiredPlatform]) {
      throw new Error(
        `${tool.repo} ${release.tag_name} is missing required ${requiredPlatform} asset`,
      );
    }
  }

  return {
    id: tool.id,
    name: tool.name,
    repo: tool.repo,
    version,
    tagName: release.tag_name,
    publishedAt: release.published_at,
    releaseUrl: release.html_url,
    downloads,
  };
}

export async function fetchLatestRelease(tool, fetchImpl = fetch) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'vulcan-tools-hub-release-sync',
  };

  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetchImpl(`https://api.github.com/repos/${tool.repo}/releases/latest`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`${tool.repo} latest release request failed with HTTP ${response.status}`);
  }

  return response.json();
}
