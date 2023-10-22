import { actionRegistry } from '../action';
import { testOnlyResetIdGeneration } from './id_generation';

export function testCleanup() {
  testOnlyResetIdGeneration();
  actionRegistry.clear();
}
