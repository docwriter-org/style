import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractVerbatimText } from '../skills/docwriter-style-generator/scripts/save-source.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const saver = join(root, 'skills/docwriter-style-generator/scripts/save-source.mjs');
const fixture = readFileSync(join(root, 'tests/fixture-prose.txt'), 'utf8');
const phrase = 'splendid and lonely courage';

function save(args, input) {
	return execFileSync(process.execPath, [saver, ...args], {
		encoding: 'utf8',
		input
	});
}

const extractedFile = extractVerbatimText(fixture);
if (!extractedFile.includes(phrase)) throw new Error('plain extract dropped a verbatim phrase');
if (extractedFile.replace(/\n$/, '') !== fixture.replace(/\r\n/g, '\n').replace(/\n$/, '')) {
	throw new Error('plain extract rewrote the file');
}

const html = `<!doctype html>
<html>
<body>
<nav>Home About <a href="/">Subscribe</a></nav>
<aside>In this essay, the author argues that Mallarme prefers motion to rest.</aside>
<article>
<p>It is in his moments of movement that Mallarme is exciting, and his moments of lingering are his moments of extreme conventionality.</p>
<p>There is a splendid and lonely courage in the rejection of the accustomed word when the accustomed word is not the inevitable word.</p>
</article>
<footer>Cookie settings</footer>
</body>
</html>`;

const fromHtml = extractVerbatimText(html, { html: true });
if (!fromHtml.includes(phrase)) throw new Error('HTML extract lost the verbatim sentence');
if (!fromHtml.includes('moments of movement that Mallarme is exciting')) {
	throw new Error('HTML extract lost the opening sentence');
}
for (const leak of ['Subscribe', 'In this essay, the author argues', 'Cookie settings']) {
	if (fromHtml.includes(leak)) throw new Error(`HTML extract kept chrome or paraphrase: ${leak}`);
}

const ld = `<html><body>
<script type="application/ld+json">
{"@type":"Article","articleBody":"There is a ${phrase}. He will not take the phrase that lies in wait. He will not have the easy metaphor, the ready epithet, the expected cadence. The language he wants is the language that has not yet been used for that thought, and he will wait, or he will invent, rather than accept a substitute that has served another man. The reader who will walk with him finds the path lit."}
</script>
<nav>Menu</nav>
<p>Short teaser that is not the essay.</p>
</body></html>`;
const fromLd = extractVerbatimText(ld, { html: true });
if (!fromLd.includes(phrase) || fromLd.includes('Short teaser')) {
	throw new Error('JSON-LD extract should use articleBody, not the teaser');
}

const scratch = mkdtempSync(join(tmpdir(), 'style-save-'));
const homeA = join(scratch, 'claude');
const homeB = join(scratch, 'agents');
try {
	const sourceFile = join(scratch, 'essay.txt');
	writeFileSync(sourceFile, fixture);
	const receipt = save([
		'--label', 'Essay Title!',
		'--file', sourceFile,
		'--home', homeA,
		'--home', homeB
	]);
	if (!receipt.includes('Saved essay-title')) throw new Error(`bad receipt: ${receipt}`);
	if (!receipt.includes('It is in his moments of movement')) {
		throw new Error(`receipt First: line should quote the file: ${receipt}`);
	}
	const copyA = readFileSync(join(homeA, 'sources/essay-title.txt'), 'utf8');
	const copyB = readFileSync(join(homeB, 'sources/essay-title.txt'), 'utf8');
	if (copyA !== copyB) throw new Error('homes diverged');
	if (!copyA.includes(phrase)) throw new Error('saved file paraphrased the fixture');
	if (copyA.replace(/\n$/, '') !== fixture.replace(/\n$/, '')) {
		throw new Error('saved file is not verbatim');
	}

	const pasted = 'He will not take the phrase that lies in wait.\n';
	save(['--label', 'talk', '--stdin', '--home', homeA], pasted);
	const talk = readFileSync(join(homeA, 'sources/talk.txt'), 'utf8');
	if (talk.replace(/\n$/, '') !== pasted.replace(/\n$/, '')) {
		throw new Error('stdin save rewrote the paste');
	}
} finally {
	rmSync(scratch, { recursive: true, force: true });
}

process.stdout.write('ok: sources stay verbatim (file, paste, HTML chrome-strip)\n');
