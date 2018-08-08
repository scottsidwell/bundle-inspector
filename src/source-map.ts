import { CoverageEntry } from "puppeteer";
import { RawSourceMap } from "source-map";
import path from 'path';
import fetch from 'node-fetch';

const commentRegex = () =>
  /^\s*\/(?:\/|\*)[@#]\s+sourceMappingURL=data:(?:application|text)\/json;(?:charset[:=]\S+?;)?base64,(?:.*)$/gm;

const mapFileCommentRegex = () =>
  /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"`]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/){1}[ \t]*$)/gm;

export function fromComment(content: string): RawSourceMap | null {
  const sourcemapComment = content.match(commentRegex());
  if (sourcemapComment) {
    const comment = sourcemapComment
      .pop()!
      .replace(/^\/\*/g, "//")
      .replace(/\*\/$/g, "");
    const inlineSourceMap = comment.split(",").pop()!;
    const sm = new Buffer(inlineSourceMap, "base64").toString();
    return JSON.parse(sm);
  }
  return null;
}

export async function fromExternalFile(
  content: string,
  originalScriptUrl: string
): Promise<RawSourceMap | null> {
  var m = mapFileCommentRegex().exec(content);
  if (m) {
    const filename = m[1] || m[2];
    if (filename) {
      const url = new URL(filename, originalScriptUrl);
      try {
        const response = await fetch(url.toString());
        return await response.json();
      } catch (e) {}

      // If the previous attempt failed, try adding just the basename to the existing url
      if (originalScriptUrl.endsWith('.js')) {
        const obviousURL = originalScriptUrl + '.map';
        try {
          const response = await fetch(obviousURL);
          return await response.json();
        } catch (e) {}
      }

      // If the previous attempt failed, try adding just the basename to the existing url
      if (path.basename(filename) !== filename) {
        const backupURL = new URL(path.basename(filename), originalScriptUrl);
        try {
          const response = await fetch(backupURL.toString());
          return await response.json();
        } catch (e) {}
      }
    }
  }
  return null;
}

export async function fetchSourceMaps(coverage: CoverageEntry[]) {
  const sourcemaps = new Map<string, RawSourceMap>();
  for (const entry of coverage) {
    const maybeSourcemap =
      fromComment(entry.text) ||
      (await fromExternalFile(entry.text, entry.url));
    if (maybeSourcemap) {
      sourcemaps.set(entry.text, maybeSourcemap);
    }
  }
  return sourcemaps;
}