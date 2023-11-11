import type { EternalVarsBase } from './eternal-vars-base';
import type { NaukarRemote } from './naukar';

export interface EternalVarsWindow extends EternalVarsBase {
  naukar: NaukarRemote;
}
