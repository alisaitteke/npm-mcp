/**
 * NPM Registry API Types
 * Based on official npm registry responses
 */

// Package document (packument) - full package metadata
export interface Packument {
  name: string;
  description?: string;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  versions: {
    [version: string]: PackageVersion;
  };
  time: {
    created: string;
    modified: string;
    [version: string]: string;
  };
  maintainers?: Person[];
  author?: Person;
  repository?: Repository;
  homepage?: string;
  bugs?: { url?: string };
  license?: string;
  readme?: string;
  readmeFilename?: string;
  keywords?: string[];
}

// Individual package version metadata
export interface PackageVersion {
  name: string;
  version: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
    fileCount?: number;
    unpackedSize?: number;
  };
  author?: Person;
  contributors?: Person[];
  maintainers?: Person[];
  license?: string;
  repository?: Repository;
  homepage?: string;
  bugs?: { url?: string };
  keywords?: string[];
  engines?: Record<string, string>;
}

// Person type for author/maintainer
export interface Person {
  name: string;
  email?: string;
  url?: string;
  username?: string;
}

// Repository information
export interface Repository {
  type: string;
  url: string;
  directory?: string;
}

// NPM search API response
export interface SearchResponse {
  objects: SearchObject[];
  total: number;
  time: string;
}

export interface SearchObject {
  package: SearchPackage;
  score: SearchScore;
  searchScore: number;
}

export interface SearchPackage {
  name: string;
  scope?: string;
  version: string;
  description?: string;
  keywords?: string[];
  date: string;
  links: {
    npm?: string;
    homepage?: string;
    repository?: string;
    bugs?: string;
  };
  author?: Person;
  publisher: Person;
  maintainers: Person[];
}

export interface SearchScore {
  final: number;
  detail: {
    quality: number;
    popularity: number;
    maintenance: number;
  };
}

// Abbreviated package metadata (used in some endpoints)
export interface AbbreviatedPackument {
  name: string;
  modified: string;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  versions: {
    [version: string]: AbbreviatedVersion;
  };
}

export interface AbbreviatedVersion {
  name: string;
  version: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Download statistics
export interface DownloadStats {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

// Error response from registry
export interface RegistryError {
  error: string;
  reason?: string;
}
