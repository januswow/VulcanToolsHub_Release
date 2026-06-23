import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  collectRequiredAssets,
  deletePublicReleaseAssets,
  ensurePublicRelease,
  verifyAssetDigest,
} from '../scripts/sync-release-assets.mjs';

function sha256Digest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

test('verifies source asset digest before mirroring binary downloads', () => {
  const bytes = Buffer.from('release binary');

  assert.doesNotThrow(() =>
    verifyAssetDigest(
      {
        name: 'SampleTool-1.2.3-mac-arm64.zip',
        digest: sha256Digest(bytes),
      },
      bytes,
    ),
  );

  assert.throws(
    () =>
      verifyAssetDigest(
        {
          name: 'SampleTool-1.2.3-mac-arm64.zip',
          digest: sha256Digest('different binary'),
        },
        bytes,
      ),
    /digest mismatch/,
  );
});

test('collects only required desktop assets and fails when one platform is missing', () => {
  const tool = {
    repo: 'januswow/SampleTool',
  };

  const release = {
    tag_name: 'v1.2.3',
    assets: [
      { name: 'SampleTool-1.2.3-mac-arm64.zip' },
      { name: 'SampleTool-1.2.3-win-x64-portable.exe' },
      { name: 'SampleTool-1.2.3.dmg' },
    ],
  };

  assert.deepEqual(
    collectRequiredAssets(tool, release).map(({ asset }) => asset.name),
    ['SampleTool-1.2.3-mac-arm64.zip', 'SampleTool-1.2.3-win-x64-portable.exe'],
  );

  assert.throws(
    () =>
      collectRequiredAssets(tool, {
        tag_name: 'v1.2.3',
        assets: [{ name: 'SampleTool-1.2.3-mac-arm64.zip' }],
      }),
    /missing required windows-portable asset/,
  );
});

test('deletes existing public release assets before uploading the current set', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 204,
    };
  };

  await deletePublicReleaseAssets({
    repo: 'januswow/VulcanToolsHub_Release',
    release: {
      assets: [{ id: 101 }, { id: 102 }],
    },
    token: 'token',
    fetchImpl,
  });

  assert.deepEqual(
    calls.map((call) => [call.options.method, call.url]),
    [
      ['DELETE', 'https://api.github.com/repos/januswow/VulcanToolsHub_Release/releases/assets/101'],
      ['DELETE', 'https://api.github.com/repos/januswow/VulcanToolsHub_Release/releases/assets/102'],
    ],
  );
});

test('creates the fixed public release when it does not exist', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url.endsWith('/releases/tags/vulcan-tools-latest')) {
      return {
        ok: false,
        status: 404,
      };
    }

    return {
      ok: true,
      status: 201,
      json: async () => ({
        tag_name: 'vulcan-tools-latest',
      }),
    };
  };

  const release = await ensurePublicRelease({
    repo: 'januswow/VulcanToolsHub_Release',
    tagName: 'vulcan-tools-latest',
    token: 'token',
    fetchImpl,
  });

  assert.equal(release.tag_name, 'vulcan-tools-latest');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(JSON.parse(calls[1].options.body).tag_name, 'vulcan-tools-latest');
});
