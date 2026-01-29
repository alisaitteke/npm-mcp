import pLimit from 'p-limit';
import { LRUCache } from 'lru-cache';
import type {
  Packument,
  SearchResponse,
  DownloadStats,
  RegistryError,
} from './types.js';

/**
 * Configuration for NPM Registry API Client
 */
export interface RegistryClientConfig {
  registryUrl?: string;
  timeout?: number;
  maxRetries?: number;
  cacheMaxSize?: number;
  cacheTTL?: number;
  maxConcurrent?: number;
}

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  attempt: number;
  maxAttempts: number;
  baseDelay: number;
}

/**
 * NPM Registry API Client
 * Provides methods to interact with npm registry with rate limiting, caching, and error handling
 */
export class RegistryClient {
  private registryUrl: string;
  private timeout: number;
  private maxRetries: number;
  private cache: LRUCache<string, any>;
  private limiter: ReturnType<typeof pLimit>;

  constructor(config: RegistryClientConfig = {}) {
    this.registryUrl = config.registryUrl || 'https://registry.npmjs.org';
    this.timeout = config.timeout || 10000;
    this.maxRetries = config.maxRetries || 3;

    // Initialize cache with 5-minute TTL
    this.cache = new LRUCache({
      max: config.cacheMaxSize || 500,
      ttl: config.cacheTTL || 5 * 60 * 1000, // 5 minutes
    });

    // Rate limiter: max 10 concurrent requests
    this.limiter = pLimit(config.maxConcurrent || 10);
  }

  /**
   * Fetch package metadata (packument)
   */
  async getPackage(packageName: string): Promise<Packument> {
    const url = `${this.registryUrl}/${encodeURIComponent(packageName)}`;
    return this.fetchWithCache<Packument>(url);
  }

  /**
   * Fetch specific package version
   */
  async getPackageVersion(
    packageName: string,
    version: string
  ): Promise<Packument['versions'][string]> {
    const url = `${this.registryUrl}/${encodeURIComponent(packageName)}/${version}`;
    return this.fetchWithCache(url);
  }

  /**
   * Search packages by query
   */
  async searchPackages(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      text: query,
      size: String(options.limit || 20),
      from: String(options.offset || 0),
    });

    const url = `${this.registryUrl}/-/v1/search?${params}`;
    return this.fetchWithCache<SearchResponse>(url);
  }

  /**
   * Get download statistics for a package
   */
  async getDownloadStats(
    packageName: string,
    period: 'last-day' | 'last-week' | 'last-month' = 'last-week'
  ): Promise<DownloadStats> {
    const url = `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(
      packageName
    )}`;
    return this.fetchWithCache<DownloadStats>(url);
  }

  /**
   * Fetch with caching and rate limiting
   */
  private async fetchWithCache<T>(url: string): Promise<T> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      return cached as T;
    }

    // Fetch with rate limiting
    const result = await this.limiter(() => this.fetchWithRetry<T>(url));

    // Cache successful response
    this.cache.set(url, result);

    return result;
  }

  /**
   * Fetch with exponential backoff retry using native fetch
   */
  private async fetchWithRetry<T>(
    url: string,
    retryConfig?: RetryConfig
  ): Promise<T> {
    const config: RetryConfig = retryConfig || {
      attempt: 0,
      maxAttempts: this.maxRetries,
      baseDelay: 1000,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'npm-registry-mcp/1.0.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429)
      if (response.status === 429) {
        if (config.attempt < config.maxAttempts) {
          const delay = this.calculateBackoff(config);
          await this.sleep(delay);
          return this.fetchWithRetry<T>(url, {
            ...config,
            attempt: config.attempt + 1,
          });
        }
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Handle not found
      if (response.status === 404) {
        throw new Error('Package not found');
      }

      // Handle other errors
      if (response.status >= 400) {
        const errorBody = (await response.json()) as RegistryError;
        throw new Error(
          errorBody.error ||
            `HTTP ${response.status}: ${errorBody.reason || 'Unknown error'}`
        );
      }

      // Parse successful response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Handle abort error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // Retry on network errors
      if (
        error instanceof Error &&
        (error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('fetch failed')) &&
        config.attempt < config.maxAttempts
      ) {
        const delay = this.calculateBackoff(config);
        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, {
          ...config,
          attempt: config.attempt + 1,
        });
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(2, config.attempt);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return exponentialDelay + jitter;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}
