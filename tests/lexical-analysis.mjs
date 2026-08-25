import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const analyzer = join(root, 'skills/docwriter-style-generator/scripts/analyze-style.mjs');
const fixture = join(root, 'tests/fixture-prose.txt');
const second = `There is a splendid and lonely courage in the rejection of the accustomed word
when the accustomed word is not the inevitable word. He will not take the
phrase that lies in wait. The language he wants has not yet been used for that
thought, and he will invent rather than accept a substitute that has served
another man. The reader who will walk with him finds the path lit by the exact
noun and the unrepeatable adjective.`;

function run(args) {
	return JSON.parse(execFileSync(process.execPath, [analyzer, ...args], { encoding: 'utf8' }));
}

function ids(report) {
	return new Set(report.measurements.map((measurement) => measurement.id));
}

function families(report) {
	return new Set(report.measurements.map((measurement) => measurement.family));
}

const lexical = run(['--input', fixture, '--words', '--measured']);
if (!families(lexical).has('lexical')) throw new Error('lexical family missing from --family lexical output');
if ([...families(lexical)].some((family) => family !== 'lexical')) {
	throw new Error(`expected only lexical measurements, got ${[...families(lexical)]}`);
}
for (const id of [
	'lexical.a1.morphological-complexity',
	'lexical.a1.lexical-density',
	'lexical.a1.concreteness-mean',
	'lexical.a3.adjective-rate',
	'lexical.a5.adverb-rate'
]) {
	if (!ids(lexical).has(id)) throw new Error(`missing measured lexical metric ${id}`);
}
if (lexical.measurements.some((measurement) => measurement.value === 0)) {
	throw new Error('--measured left a zero lexical score in the report');
}

const scratch = mkdtempSync(join(tmpdir(), 'style-lexical-'));
try {
	const extra = join(scratch, 'second.txt');
	writeFileSync(extra, second, 'utf8');
	const corpus = run(['--input', fixture, '--input', extra, '--words', '--measured']);
	if (corpus.documents.length !== 2) throw new Error(`expected 2 documents, got ${corpus.documents.length}`);
	if (!ids(corpus).has('lexical.a1.hapax-rate')) throw new Error('corpus lexical.a1.hapax-rate missing');
	if (!ids(corpus).has('lexical.a1.signature-ngrams')) throw new Error('corpus lexical.a1.signature-ngrams missing');
} finally {
	rmSync(scratch, { recursive: true, force: true });
}

const full = run(['--input', fixture, '--measured']);
if (!['lexical', 'grammatical', 'figures', 'cohesion-context'].every((family) => families(full).has(family))) {
	throw new Error(`full report families were ${[...families(full)]}`);
}

const skill = readFileSync(join(root, 'skills/docwriter-style-generator/SKILL.md'), 'utf8');
for (const needle of [
	'Word-level measurements',
	'scripts/analyze-style.mjs',
	'--words',
	'Words and phrases',
	'multi-agent pass',
	'~/.claude/skills/my-writing-style/sources/',
	'~/.agents/skills/my-writing-style/',
	'$docwriter-style-generator',
	'Add a source',
	'Update propositions'
]) {
	if (!skill.includes(needle)) throw new Error(`SKILL.md is missing ${needle}`);
}
if (skill.includes('/tmp/source-')) {
	throw new Error('cleaned sources should live in the style skill, not /tmp');
}

const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
if (marketplace.name !== 'docwriter-style') throw new Error('marketplace name should be docwriter-style');
if (!marketplace.plugins.some((plugin) => plugin.name === 'docwriter-style-generator')) {
	throw new Error('marketplace must list docwriter-style-generator');
}
const codexPlugin = JSON.parse(readFileSync(join(root, '.codex-plugin/plugin.json'), 'utf8'));
if (codexPlugin.name !== 'docwriter-style-generator' || codexPlugin.skills !== './skills/') {
	throw new Error('Codex plugin manifest must name the generator and point at ./skills/');
}
const agentsMarketplace = JSON.parse(readFileSync(join(root, '.agents/plugins/marketplace.json'), 'utf8'));
if (agentsMarketplace.name !== 'docwriter-style') throw new Error('Codex marketplace name should be docwriter-style');
const [codexListing] = agentsMarketplace.plugins;
if (codexListing?.source?.path !== './' || !codexListing.policy?.installation || !codexListing.category) {
	throw new Error('Codex marketplace must list ./ with policy and category');
}

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const needle of [
	'https://docs.docwriter.org/customize/style',
	'/plugin marketplace update docwriter-style',
	'claude plugin marketplace update docwriter-style',
	'codex plugin marketplace upgrade docwriter-style',
	'$docwriter-style-generator'
]) {
	if (!readme.includes(needle)) throw new Error(`README.md is missing ${needle}`);
}

process.stdout.write(`ok: ${lexical.measurements.length} measured lexical metrics, ${full.measurements.length} measured metrics across four families\n`);
