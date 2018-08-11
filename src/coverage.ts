import { CoverageEntry } from "puppeteer";
import { SourceMapConsumer, RawSourceMap, NullableMappedPosition } from "source-map";
import { InspectedBundleStats } from "./types";

async function walkScript(script: string, sourcemap: RawSourceMap, callback: (originalPos: NullableMappedPosition, index: number) => void) {
  const consumer = await new SourceMapConsumer(sourcemap);
  for (
    let index = 0, line = 1, column = 0, length = script.length;
    index <= length;
    index++, column++
  ) {
    if (script[index] === "\n") { line++; column = -1; continue; }
    const originalPos = consumer.originalPositionFor({ line, column });
    callback(originalPos, index);
  }
  consumer.destroy();
}

function sum(numbers: number[]) {
  return numbers.reduce((total, number) => number + total, 0);
}
function metric(totalUsed: number, totalSize: number) {
  return { totalUsed, totalSize, get totalUnused() { return this.totalSize - this.totalUsed } };
}

type CodeUsage = { totalSize: number; totalUsed: number, totalUnused: number };
export async function parseCoverageWithSourcemaps(coverage: CoverageEntry[], sourcemaps: Map<string, RawSourceMap>): Promise<InspectedBundleStats> {
  const metrics = {} as { [srcUrl: string]: { [packageString: string]: CodeUsage } };
  for (const entry of coverage) {
    metrics[entry.url] = metrics[entry.url] || {};
    let rangeIndex = 0;
    if (sourcemaps.has(entry.text)) {
      await walkScript(entry.text, sourcemaps.get(entry.text)!, (originalPos, index) => {
        const filePath = originalPos.source || "<unmapped>";

        // Ensure we have a metric to set
        metrics[entry.url][filePath] = metrics[entry.url][filePath] || metric(0,0);
        // Increment the total size by one
        metrics[entry.url][filePath].totalSize++;

        // If the current position is in the range, then count it
        if (entry.ranges[rangeIndex].end <= index) {
          rangeIndex++;
        }
        if (entry.ranges[rangeIndex] && index >= entry.ranges[rangeIndex].start && index < entry.ranges[rangeIndex].end) {
          metrics[entry.url][filePath].totalUsed++
        }
      });
    } else {
      metrics[entry.url]["<unknown>"] = metric(
        entry.text.length,
        sum(entry.ranges.map(range => range.end - range.start))
      );
    }
  }

  // Flatten { script: { packagePath: { totalSize, totalUsed } } }
  // to: { script: [{ packagePath, totalSize, totalUsed }] }
  return Object.keys(metrics).reduce((stats, key) => {
    stats[key] = Object.keys(metrics[key]).map(pkgPath => ({ pkgPath, ...metrics[key][pkgPath] }));
    return stats;
  }, {} as InspectedBundleStats);
}
