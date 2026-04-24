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
      ...tsJestPaths,
      '^(\\.{1,2}/.*)\\.js$': '$1',
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@user/(.*)$': '<rootDir>/src/user/$1',
      '^@post/(.*)$': '<rootDir>/src/post/$1',
      '^@messages/(.*)$': '<rootDir>/src/message/$1',
      '^@shared/(.*)$': '<rootDir>/src/shared/$1',
      '^@auth/(.*)$': '<rootDir>/src/auth/$1',
   },
   roots: ['<rootDir>']
}
