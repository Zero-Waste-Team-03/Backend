import { registerAs } from '@nestjs/config';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

/**
 * GraphQL configuration for the application
 *
 * This configuration uses the Code First approach where GraphQL schema
 * is automatically generated from TypeScript classes and decorators
 *
 * @returns {ApolloDriverConfig} GraphQL configuration object
 */
export default registerAs(
  'graphql',
  (): ApolloDriverConfig => ({
    // Code First approach - schema is generated from TypeScript classes
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    // Sort schema fields alphabetically for consistency
    sortSchema: true,

    // Enable GraphQL Playground in development
    playground: true,

    // Include stack traces in errors during development
    debug: process.env.NODE_ENV !== 'production',

    csrfPrevention: (process.env.PREVENT_CSRF || 'true') === 'true',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    context: ({ req, res }: { req: any; res: any }) => ({ req, res }),

    // Format errors to include relevant information
    formatError: (error) => {
      return {
        message: error.message,
        code: error.extensions?.code,
        locations: error.locations,
        path: error.path,
      };
    },
  }),
);
