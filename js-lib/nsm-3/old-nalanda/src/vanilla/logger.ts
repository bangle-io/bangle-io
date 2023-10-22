import type { Operation } from './operation';
import type { Transaction } from './transaction';
import { META_DISPATCHER, TX_META_STORE_NAME } from './transaction';
import type { SliceId } from './types';

type LogTypes = TransactionLog | OperationLog | EffectLog;

export type DebugLogger = (log: LogTypes) => void;

export interface TransactionLog {
  type: 'TRANSACTION';
  actionId: string | string[];
  dispatcher?: string | undefined;
  params: unknown[] | unknown[][];
  sourceSlices: SliceId | SliceId[];
  store?: string | undefined;
  targetSlices: SliceId | SliceId[];
  txId: string;
}

export interface OperationLog {
  type: 'OPERATION';
  dispatcher?: string | undefined;
  operationId: string;
  store?: string | undefined;
}

export interface EffectLog {
  type: 'SYNC_UPDATE_EFFECT' | 'UPDATE_EFFECT';
  name: string;
  changed: string;
}

export function opLog(op: Operation<any>): OperationLog {
  return {
    type: 'OPERATION',
    operationId: op.name,
    dispatcher: op.metadata.getMetadata(META_DISPATCHER),
    store: op.metadata.getMetadata(TX_META_STORE_NAME),
  };
}

export function txLog(tx: Transaction<any>): TransactionLog {
  let log: TransactionLog = {
    type: 'TRANSACTION',
    sourceSlices:
      tx.steps.length === 1
        ? tx.steps[0]!.sourceSliceId
        : tx.steps.map((s) => s.sourceSliceId),
    targetSlices:
      tx.steps.length === 1
        ? tx.steps[0]!.targetSliceId
        : tx.steps.map((s) => s.targetSliceId),
    actionId:
      tx.steps.length === 1
        ? tx.steps[0]!.actionId
        : tx.steps.map((s) => s.actionId),
    dispatcher: tx.metadata.getMetadata(META_DISPATCHER),
    store: tx.metadata.getMetadata(TX_META_STORE_NAME),
    txId: tx.txId,
    params:
      tx.steps.length === 1
        ? tx.steps[0]!.params
        : tx.steps.map((s) => s.params),
  };

  return Object.fromEntries(
    Object.entries(log).filter((r) => r[1] !== undefined),
  ) as any;
}
