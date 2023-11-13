import { EternalVarsBase } from './eternal-vars-base';

export interface EternalVarsWorker extends EternalVarsBase {
  parentInfo: EternalVarsParentInfo;
}

export type EternalVarsParentInfo = {
  browserContextId: string;
};
