import * as fs from 'fs';
import * as path from 'path';

/**
 * GraphQL Query Loader Utility
 * Centralized loading for all GraphQL queries
 */
export class GraphQLQueries {
  private static queries: Map<string, string> = new Map();

  /**
   * Load a GraphQL query from file
   * @param queryName - Name of the query file (without .graphql extension)
   * @returns The GraphQL query string
   */
  static load(queryName: string): string {
    if (this.queries.has(queryName)) {
      return this.queries.get(queryName)!;
    }

    try {
      const queryPath = path.join(__dirname, `${queryName}.graphql`);
      const query = fs.readFileSync(queryPath, 'utf8');
      this.queries.set(queryName, query);
      return query;
    } catch (error) {
      throw new Error(`Failed to load GraphQL query '${queryName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get job details query
   */
  static get jobDetails(): string {
    return this.load('job-details');
  }

  /**
   * Get job search query
   */
  static get jobSearch(): string {
    return this.load('job-search');
  }

  /**
   * Get categories query
   */
  static get categories(): string {
    return this.load('categories');
  }

  /**
   * Get introspect type query
   */
  static get introspectType(): string {
    return this.load('introspect-type');
  }

  /**
   * Get introspect schema query
   */
  static get introspectSchema(): string {
    return this.load('introspect-schema');
  }

  /**
   * Clear cached queries (useful for testing)
   */
  static clearCache(): void {
    this.queries.clear();
  }
}