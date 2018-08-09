import fs from 'fs';
import path from 'path';
import util from 'util';
import { InspectedBundleStats } from "./types";
const fsReadFile = util.promisify(fs.readFile);
const fsWriteFile = util.promisify(fs.writeFile);

export async function generateReport(url: string, stats: InspectedBundleStats) {
  const data = {
    bundleScriptSizes: getBundleScriptSizes(stats),
    packageDuplicates: getPackageDuplicates(stats),
    unusedPackages: getUnusedPackages(stats),
    unusedApplicationCode: getUnusedApplicationCode(stats),
  };
  const injectableStatistics = JSON.stringify(JSON.stringify(data));
  const filename = `${new Date().toISOString()}@${url.replace(/[\/\.\: ]+/g, '-')}.html`;
  const html = await fsReadFile(path.resolve(__dirname, './template.html'), 'utf-8');
  // Write out file with statistics
  await fsWriteFile(
    filename,
    html.replace('[[ STATISTICS ]]', `JSON.parse(${injectableStatistics})`)
  );
}

function flatten<T>(args: T[][]) {
  return ([] as T[]).concat(...args);
}

const NPM_PACKAGES = new RegExp('(~|node_modules)\/((\@[^/]+\/)?[^/]+)', 'g');
const isDependency = (str: string) => {
  return str.includes('node_modules/') || str.includes('webpack:///~/');
}

export type BundleScriptSizes = { scriptName: string, totalSize: number, totalUsed: number }[];
export function getBundleScriptSizes(stats: InspectedBundleStats): BundleScriptSizes {
  return Object.keys(stats)
    .map(scriptUrl => ({
      scriptName: scriptUrl,
      totalSize: stats[scriptUrl].reduce((prev, curr) => prev + curr.totalSize, 0),
      totalUsed: stats[scriptUrl].reduce((prev, curr) => prev + curr.totalUsed, 0),
      get totalUnused() { return this.totalSize - this.totalUsed }
    }))
}

export type PackageDuplicates = { scriptName: string, packageName: string, requiredFrom: string[], totalSize: number }[]
export function getPackageDuplicates(stats: InspectedBundleStats): PackageDuplicates {
  return flatten(Object.keys(stats)
    .map(scriptUrl =>
      stats[scriptUrl]
        // Ignore application code
        .filter(i => isDependency(i.pkgPath))
        // Find the package and whether it is a duplicate or not
        .map(row => {
          const getPackageNameFromPath = (i: string) => i.substring(i.indexOf('/') + 1);
          const packages = row.pkgPath.match(NPM_PACKAGES)!.map(getPackageNameFromPath);
          const packageName = packages[packages.length - 1];
          const requiredFrom = packages.slice(0, -1).join(' → ') || '<top-level>';
          return { packageName, requiredFrom, totalSize: row.totalSize };
        })
        // Since the array is sorted, we can guarantee this will be next to
        // a duplicate [packageName, requiredFrom] pair (if one exists)
        .sort((a, b) =>(a.packageName.localeCompare(b.packageName)) || (a.requiredFrom.localeCompare(b.requiredFrom)))
        .reduceRight((array, next) => {
          const row = array.length && array[array.length - 1];
          if (row && row.packageName === next.packageName) {
            row.totalSize += next.totalSize;
            if (row.requiredFrom.indexOf(next.requiredFrom) === -1) {
              row.requiredFrom.push(next.requiredFrom);
            }
          } else {
            array.push({ scriptName: scriptUrl, packageName: next.packageName, totalSize: next.totalSize, requiredFrom: [next.requiredFrom] });
          }
          return array;
        }, [] as PackageDuplicates)
    ));
}

export type UnusedPackages = { scriptName: string, packageName: string, totalSize: number, totalUnused: number }[];
export function getUnusedPackages(stats: InspectedBundleStats): UnusedPackages {
  return flatten(Object.keys(stats)
    .map(scriptUrl =>
      stats[scriptUrl]
        // Ignore application code
        .filter(i => isDependency(i.pkgPath))
        // Find the package and whether it is a duplicate or not
        .map(row => {
          const getPackageNameFromPath = (i: string) => i.substring(i.indexOf('/') + 1);
          const packages = row.pkgPath.match(NPM_PACKAGES)!.map(getPackageNameFromPath);
          const packageName = packages.join(' → ');
          return { packageName, totalSize: row.totalSize, totalUnused: row.totalUnused };
        })
        // Since the array is sorted, we can guarantee we will merge all packageNames together
        .sort((a, b) => a.packageName.localeCompare(b.packageName))
        .reduce((array, next) => {
          const row = array.length && array[array.length - 1];
          if (row && row.packageName === next.packageName) {
            row.totalSize += next.totalSize;
            row.totalUnused += next.totalUnused;
          } else {
            array.push({ scriptName: scriptUrl, ...next })
          }
          return array;
        }, [] as UnusedPackages)
    ))
}

export type UnusedApplicationCode = { scriptName: string, codePath: string, totalSize: number, totalUnused: number }[];
export function getUnusedApplicationCode(stats: InspectedBundleStats): UnusedApplicationCode {
  return flatten(Object.keys(stats)
    .map(scriptUrl =>
      stats[scriptUrl]
        // Ignore dependency code
        .filter(i => !isDependency(i.pkgPath))
        // Since the array is sorted, we can guarantee we will merge all packageNames together
        .sort((a, b) => a.pkgPath.localeCompare(b.pkgPath))
        .map(row => ({
          scriptName: scriptUrl,
          codePath: row.pkgPath,
          totalSize: row.totalSize,
          totalUnused: row.totalUnused,
        })) as UnusedApplicationCode
    ));
}