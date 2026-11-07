#!/usr/bin/env python3
"""Prepare exact R4 candidate asset pins from explicit local inputs. No network/Git.

Preserves release build, all flags, historical modules/CSS/PDFs. Only the pilot
entry and five new dual-workspace modules receive the new cache identity.
Run against a candidate copy, never a deployed directory. This is NOT release GO.
"""
import argparse, copy, hashlib, json, posixpath, re
from pathlib import Path
BASE = '9aaddfe21d77302224f93ea82be3b215c86769d6'
BUILD = 'ncc-pilot-3a40474052be'
VERSION = 'ncc-dual-workspace-r4-20261106'
PREVIOUS_MANIFEST_SHA256 = 'ec8890b59f106771fadefb84a0e7cec16a28a0c3571203601597ccf3947f3348'
MANIFEST = 'efg-nutrition/docs/guide-return-candidate/asset-manifest.json'
PILOT = 'efg-nutrition/pilot/pilot.js'
HTML = 'efg-nutrition/pilot/index.html'
CSS = 'efg-nutrition/pilot/dual-workspace.css'
NEW = ['efg-nutrition/pilot/dual-workspace-' + name + '.mjs'
       for name in ['bootstrap', 'candidate', 'frame', 'integration', 'panel']]
MODULE_EDGE = re.compile(r'''(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}/[^"']+)\2''')
def sha(data):
    return hashlib.sha256(data).hexdigest()
def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
def flags(source):
    return re.findall(r'(?:export\s+)?const\s+([A-Z][A-Z0-9_]*(?:ENABLED|VERIFIED))\s*=\s*(true|false)\s*;', source)
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--candidate-root', type=Path, required=True)
    ap.add_argument('--baseline-root', type=Path, required=True)
    ap.add_argument('--base-tree', type=Path, required=True)
    ap.add_argument('--evidence', type=Path, required=True)
    args = ap.parse_args()
    candidate, baseline = args.candidate_root.resolve(), args.baseline_root.resolve()
    assert candidate != baseline and baseline not in candidate.parents and candidate not in baseline.parents, 'Baseline and candidate must be separate directories'
    tree = json.loads(args.base_tree.read_text())
    assert tree['base'] == BASE, 'Wrong baseline commit'
    locked = {entry['path']: entry['sha'] for entry in tree['files'] if entry['type'] == 'blob'}
    def original(path):
        data = (baseline / path).read_bytes()
        assert blob(data) == locked[path], 'Baseline Git blob mismatch: ' + path
        return data
    raw_manifest = original(MANIFEST)
    assert sha(raw_manifest) == PREVIOUS_MANIFEST_SHA256, 'Unexpected previous candidate manifest'
    old = json.loads(raw_manifest)
    assert old['build'] == BUILD
    before = {}
    historical = sorted(set(old['sha256']) | {item['path'] for item in old['stylesheets']})
    for path in historical:
        base = original(path)
        current = (candidate / path).read_bytes()
        before[path] = sha(current)
        if path not in [PILOT, HTML]:
            assert current == base, 'Historical asset drift outside allowed scope: ' + path
        if path.endswith(('.js', '.mjs')):
            assert flags(base.decode()) == flags(current.decode()), 'Existing feature flag changed: ' + path
    new_candidate = (candidate / NEW[1]).read_text()
    assert new_candidate.count('export const DUAL_WORKSPACE_RELEASE_ENABLED = false;') == 1, 'DUAL must stay OFF'
    html = (candidate / HTML).read_text()
    assert re.findall(r'<meta\s+name="efg-build"\s+content="([^"]+)"', html) == [BUILD], 'Release build changed'
    for item in old['stylesheets']:
        assert 'href="' + item['url'] + '"' in html, 'Historical stylesheet URL changed'
    for path in NEW + [CSS]:
        before[path] = sha((candidate / path).read_bytes())
    planned = {}
    for path in [PILOT] + NEW:
        source = (candidate / path).read_text()
        def edge(match):
            prefix, quote, reference = match.groups()
            clean = reference.split('?')[0]
            target = posixpath.normpath(posixpath.join(posixpath.dirname(path), clean))
            if target not in NEW:
                return match[0]
            return prefix + quote + clean + '?v=' + VERSION + quote
        planned[path] = MODULE_EDGE.sub(edge, source).encode()
        assert flags(source) == flags(planned[path].decode()), 'Flag changed during asset rewrite'
    html, entry_count = re.subn(r'(src="\./pilot\.js\?v=)[^"]+', r'\g<1>' + VERSION, html)
    assert entry_count == 1
    html, css_count = re.subn(r'(href="\./dual-workspace\.css\?v=)[^"]+', r'\g<1>' + VERSION, html)
    assert css_count == 1
    planned[HTML] = html.encode()
    manifest = copy.deepcopy(old)
    manifest['baseline'] = BASE
    manifest['assetVersion'] = VERSION
    for path in NEW + [PILOT]:
        manifest['moduleVersions'][path] = VERSION
    manifest['moduleVersions'] = dict(sorted(manifest['moduleVersions'].items()))
    for path in NEW:
        manifest['sha256'][path] = sha(planned[path])
    for path in [PILOT, HTML]:
        manifest['sha256'][path] = sha(planned[path])
    manifest['sha256'] = dict(sorted(manifest['sha256'].items()))
    manifest['stylesheets'].append({'path': CSS, 'sha256': sha((candidate / CSS).read_bytes()), 'url': './dual-workspace.css?v=' + VERSION})
    for path, version in old['moduleVersions'].items():
        if path != PILOT:
            assert manifest['moduleVersions'][path] == version and manifest['sha256'][path] == old['sha256'][path]
    assert manifest['immutablePeriodPdfAssets'] == old['immutablePeriodPdfAssets']
    assert manifest['immutableReportAssets'] == old['immutableReportAssets']
    encoded = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode()
    digest = sha(encoded)
    planned[MANIFEST] = encoded
    validator = 'efg-nutrition/tools/pwa-build-identity.mjs'
    source = original(validator).decode()
    needle = "'" + PREVIOUS_MANIFEST_SHA256 + "'].includes"
    assert source.count(needle) == 1
    planned[validator] = source.replace(needle, "'" + PREVIOUS_MANIFEST_SHA256 + "','" + digest + "'].includes").encode()
    approved = 'efg-nutrition/tests/approved-release-flags.mjs'
    source = original(approved).decode()
    assert source.count(PREVIOUS_MANIFEST_SHA256) == 1
    assert source.count("candidate.baseline,'" + old['baseline'] + "'") == 1
    planned[approved] = source.replace(PREVIOUS_MANIFEST_SHA256, digest).replace("candidate.baseline,'" + old['baseline'] + "'", "candidate.baseline,'" + BASE + "'").encode()
    # Commit only after all inputs, invariants and generated bytes were validated.
    for path, data in planned.items():
        destination = candidate / path
        assert destination.resolve().is_relative_to(candidate), 'Candidate target escapes through symlink: ' + path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    evidence = {'status': 'LOCAL_CANDIDATE_ASSETS_ONLY_NOT_RELEASE_GO', 'base': BASE, 'build': BUILD,
                'assetVersion': VERSION, 'priorManifestSha256': PREVIOUS_MANIFEST_SHA256, 'manifestSha256': digest,
                'newModules': NEW, 'historicalModulesUnchanged': len(old['moduleVersions']) - 1,
                'historicalStylesheetsUnchanged': len(old['stylesheets']), 'flagsUnchanged': True,
                'dualWorkspaceReleaseEnabled': False, 'networkCalls': 0,
                'beforeAfter': [{'path': path, 'before': before.get(path), 'after': sha(data)} for path, data in planned.items()]}
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps({k: evidence[k] for k in ['status', 'base', 'build', 'assetVersion', 'manifestSha256']}, indent=2))
if __name__ == '__main__':
    main()
