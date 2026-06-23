import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAsset, mapRelease, normalizeVersion } from '../scripts/release-sync-core.mjs';

const tool = {
  id: 'sample-tool',
  name: 'Sample Tool',
  repo: 'januswow/SampleTool',
};

test('normalizes leading v from release tags for app version checks', () => {
  assert.equal(normalizeVersion('v1.2.3'), '1.2.3');
  assert.equal(normalizeVersion('1.2.3'), '1.2.3');
});

test('classifies only the release assets used by local app downloads', () => {
  assert.equal(classifyAsset('SampleTool-1.2.3-mac-arm64.zip'), 'macos');
  assert.equal(classifyAsset('SampleTool-1.2.3-win-x64-portable.exe'), 'windows-portable');
  assert.equal(classifyAsset('SampleTool-1.2.3.dmg'), null);
});

test('maps latest GitHub release into a deterministic update-check payload', () => {
  const mapped = mapRelease(tool, {
    tag_name: 'v1.2.3',
    published_at: '2026-06-22T12:00:00Z',
    html_url: 'https://github.com/januswow/SampleTool/releases/tag/v1.2.3',
    assets: [
      {
        name: 'SampleTool-1.2.3-mac-arm64.zip',
        browser_download_url: 'https://example.com/mac.zip',
        size: 100,
        digest: 'sha256:mac',
        content_type: 'application/zip',
      },
      {
        name: 'SampleTool-1.2.3-win-x64-portable.exe',
        browser_download_url: 'https://example.com/win.exe',
        size: 200,
        digest: 'sha256:win',
        content_type: 'application/octet-stream',
      },
    ],
  });

  assert.equal(mapped.version, '1.2.3');
  assert.equal(mapped.downloads['windows-portable'].digest, 'sha256:win');
});

test('serves desktop downloads from the public release assets used by the hub site', () => {
  const mapped = mapRelease(tool, {
    tag_name: 'v1.2.3',
    assets: [
      {
        name: 'SampleTool-1.2.3-mac-arm64.zip',
        browser_download_url: 'https://example.com/source-mac.zip',
      },
      {
        name: 'SampleTool-1.2.3-win-x64-portable.exe',
        browser_download_url: 'https://example.com/source-win.exe',
      },
    ],
  });

  assert.equal(
    mapped.downloads.macos.url,
    'https://github.com/januswow/VulcanToolsHub_Release/releases/download/vulcan-tools-latest/SampleTool-1.2.3-mac-arm64.zip',
  );
});

test('fails loud when a required platform build is missing', () => {
  assert.throws(
    () =>
      mapRelease(tool, {
        tag_name: 'v1.2.3',
        assets: [
          {
            name: 'SampleTool-1.2.3-mac-arm64.zip',
            browser_download_url: 'https://example.com/mac.zip',
          },
        ],
      }),
    /missing required windows-portable asset/,
  );
});
