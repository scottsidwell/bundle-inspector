export type PackagePathRow = {
  pkgPath: string,
  totalSize: number;
  totalUsed: number,
  totalUnused: number
}
export type InspectedBundleStats = {
  [scriptUrl: string]: PackagePathRow[];
};