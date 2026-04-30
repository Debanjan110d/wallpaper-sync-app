import fs from "node:fs";

function normalizeVersionTag(tag) {
    if (!tag) return "";
    return tag.startsWith("v") ? tag.slice(1) : tag;
}

function extractSection(markdown, version) {
    // Matches headings like:
    // ## 1.0.4
    // ## [1.0.4]
    // ## 1.0.4 - 2026-04-29
    // ## 1.0.4 (v1.0.4)
    // ## [1.0.4] (v1.0.4)
    const headingRe = /^##\s+(?:\[)?(?<ver>[^\]\s]+)(?:\])?(?:\s+.*)?\s*$/gm;

    const matches = [];
    for (const match of markdown.matchAll(headingRe)) {
        matches.push({
            ver: match.groups?.ver ?? "",
            index: match.index ?? 0,
            headingLine: match[0],
        });
    }

    const startMatch = matches.find((m) => m.ver === version);
    if (!startMatch) return null;

    const start = startMatch.index;
    const startAfterHeading = markdown.indexOf("\n", start);
    const next = matches.find((m) => m.index > start);
    const end = next ? next.index : markdown.length;

    // Include heading line, exclude trailing whitespace.
    const section = markdown.slice(start, end).trim();
    return section;
}

const tag = process.argv[2];
if (!tag) {
    console.error("Usage: node scripts/extract-release-notes.mjs <tag> [--out <path>]");
    process.exit(2);
}

const outFlagIndex = process.argv.findIndex((arg) => arg === "--out" || arg === "--output");
const outPath = outFlagIndex >= 0 ? process.argv[outFlagIndex + 1] : null;
if (outFlagIndex >= 0 && (!outPath || outPath.startsWith("--"))) {
    console.error("Missing value for --out. Usage: node scripts/extract-release-notes.mjs <tag> [--out <path>]");
    process.exit(2);
}

const version = normalizeVersionTag(tag);
const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
const changelog = fs.readFileSync(changelogPath, "utf8");

const section = extractSection(changelog, version);
if (!section) {
    console.error(`CHANGELOG.md does not contain a '## ${version}' section for tag '${tag}'.`);
    process.exit(1);
}

// Print section as-is; GitHub release body supports Markdown.
if (outPath) {
    fs.writeFileSync(outPath, section + "\n", "utf8");
} else {
    process.stdout.write(section + "\n");
}
