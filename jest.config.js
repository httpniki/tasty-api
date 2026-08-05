/** @type {import('ts-jest').JestConfigWithTsJest} */
import dotenv from 'dotenv'
import { createRequire } from 'module'
import { pathsToModuleNameMapper } from 'ts-jest'

const require = createRequire(import.meta.url)
const { compilerOptions } = require('./tsconfig.json')

dotenv.config({
   path: '.env'
})

const tsJestPaths = pathsToModuleNameMapper(compilerOptions.paths, {
   prefix: '<rootDir>/'
})

export default {
   preset: 'ts-jest',
   testEnvironment: 'node',
   extensionsToTreatAsEsm: ['.ts'],
   transform: {
      '^.+\\.ts$': [
         'ts-jest',
         {
            useESM: true
         },
      ],
   },
   verbose: false,
   detectOpenHandles: true,
   testMatch: ['<rootDir>/__tests__/tests/**/*.test.ts'],
   moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
      '^@/(.*)\\.js$': '<rootDir>/src/$1',
      '^@user/(.*)\\.js$': '<rootDir>/src/user/$1',
      '^@post/(.*)\\.js$': '<rootDir>/src/post/$1',
      '^@shared/(.*)\\.js$': '<rootDir>/src/shared/$1',
      '^@auth/(.*)\\.js$': '<rootDir>/src/auth/$1',
      '^@chat/(.*)\\.js$': '<rootDir>/src/chat/$1',
      ...tsJestPaths,
   },
   roots: ['<rootDir>']
}
