#!/usr/bin/env node
/**
 * Write a source into the style skill homes without rewriting it.
 * Local files and pasted text are copied as-is. URLs are fetched and
 * reduced to visible article text (chrome stripped). Never summarizes.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOMES = [
	join(homedir(), '.claude/skills/my-writing-style'),
	join(homedir(), '.agents/skills/my-writing-style')
];

const CHROME = new Set(['script', 'style', 'noscript', 'template', 'svg', 'nav', 'footer', 'header', 'aside', 'form', 'iframe']);

function flagValues(args, name) {
	const values = [];
	for (let index = 0; index < args.length; index += 1) {
		if (args[index] === name && args[index + 1] && !String(args[index + 1]).startsWith('--')) {
			values.push(args[index + 1]);
			index += 1;
		}
	}
	return values;
}

function slug(value) {
	const safe = String(value)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!safe) throw new Error('label must contain letters or numbers');
	return safe;
}

function wordCount(text) {
	return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function firstWords(text, count = 40) {
	return text.trim().split(/\s+/).slice(0, count).join(' ');
}

function lastWords(text, count = 40) {
	return text.trim().split(/\s+/).slice(-count).join(' ');
}

function decodeEntities(text) {
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'");
}

function stripTagsKeepBreaks(html) {
	return html
		.replace(/<(br|hr)\b[^>]*>/gi, '\n')
		.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article|pre)>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function removeChrome(html) {
	let next = html;
	for (const tag of CHROME) {
		next = next.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
		next = next.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), ' ');
	}
	return next;
}

function innerByTag(html, tag) {
	const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
	return match?.[1] ?? '';
}

function findArticleBody(node) {
	if (!node || typeof node !== 'object') return '';
	if (Array.isArray(node)) {
		for (const item of node) {
			const found = findArticleBody(item);
			if (found) return found;
		}
		return '';
	}
	if (typeof node.articleBody === 'string' && node.articleBody.trim()) return node.articleBody;
	if (Array.isArray(node['@graph'])) return findArticleBody(node['@graph']);
	return findArticleBody(node.mainEntity);
}

function extractJsonLdArticle(html) {
	for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
		try {
			const found = findArticleBody(JSON.parse(match[1]));
			if (wordCount(found) >= 50) return found.trim();
		} catch {
			// ignore broken JSON-LD
		}
	}
	return '';
}

export function extractVerbatimText(raw, { html = false } = {}) {
	const source = String(raw ?? '').replace(/^\uFEFF/, '');
	if (!html) return source.replace(/\r\n/g, '\n');
	const fromLd = extractJsonLdArticle(source);
	if (fromLd) return fromLd.replace(/\r\n/g, '\n');
	const article = innerByTag(source, 'article') || innerByTag(source, 'main') || innerByTag(source, 'body') || source;
	return decodeEntities(stripTagsKeepBreaks(removeChrome(article))).replace(/\r\n/g, '\n');
}

function looksLikeHtml(text, contentType = '') {
	if (/html/i.test(contentType)) return true;
	return /^\s*(<!doctype html|<html\b)/i.test(text);
}

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

async function fetchUrl(url) {
	const response = await fetch(url, {
		headers: { 'user-agent': 'docwriter-style-generator/1.0 (verbatim source save)' },
		redirect: 'follow'
	});
	if (!response.ok) throw new Error(`fetch failed ${response.status} for ${url}`);
	const text = await response.text();
	return { text, html: looksLikeHtml(text, response.headers.get('content-type') ?? '') };
}

export async function saveSource({ label, text, homes, html = false, minWords = 0 }) {
	const name = slug(label);
	const body = extractVerbatimText(text, { html: html || looksLikeHtml(text) });
	if (!body.trim()) throw new Error('source is empty after chrome-strip; ask for a file or paste');
	const count = wordCount(body);
	if (minWords && count < minWords) {
		throw new Error(
			`Extract is only ${count} words — too short to trust. Ask the user for a local file or paste.`
		);
	}
	const written = [];
	for (const home of homes) {
		const dest = join(home, 'sources', `${name}.txt`);
		await mkdir(dirname(dest), { recursive: true });
		await writeFile(dest, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
		written.push(dest);
	}
	return {
		label: name,
		wordCount: count,
		first: firstWords(body),
		last: lastWords(body),
		written
	};
}

async function cli() {
	const args = process.argv.slice(2);
	const label = flagValues(args, '--label')[0];
	const file = flagValues(args, '--file')[0];
	const url = flagValues(args, '--url')[0];
	const homes = flagValues(args, '--home');
	const useStdin = args.includes('--stdin');
	if (!label || [file, url, useStdin].filter(Boolean).length !== 1) {
		throw new Error(
			'Usage: save-source.mjs --label <slug> (--file <path> | --url <url> | --stdin) [--home <dir> ...]'
		);
	}
	let text;
	let html = false;
	if (file) {
		text = await readFile(file, 'utf8');
		html = looksLikeHtml(text);
	} else if (url) {
		const fetched = await fetchUrl(url);
		text = fetched.text;
		html = fetched.html;
	} else {
		text = await readStdin();
		html = looksLikeHtml(text);
	}
	const result = await saveSource({
		label,
		text,
		html,
		minWords: url ? 200 : 0,
		homes: homes.length ? homes : DEFAULT_HOMES
	});
	process.stdout.write(
		[
			`Saved ${result.label} (${result.wordCount} words)`,
			`First: ${result.first}`,
			`Last: ${result.last}`,
			...result.written.map((path) => `Wrote ${path}`),
			''
		].join('\n')
	);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	cli().catch((error) => {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	});
}
