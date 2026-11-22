import {
  chooseAiMove,
  chooseAiNyumbaDecision,
} from './mrahaAi';
import type { GameStateSnapshot, LegalMove, PlayerId } from './mrahaEngine';

let workerInstance: Worker | null = null;
let workerFailed = false;
let reqSeq = 1;

const pendingResolvers = new Map<number, (data: unknown) => void>();

function getAiWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./aiWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerInstance.onmessage = (
        event: MessageEvent<{ id: number; move?: LegalMove | null; decision?: 'stop' | 'continue' }>
      ) => {
        const { id } = event.data;
        const resolve = pendingResolvers.get(id);
        if (resolve) {
          pendingResolvers.delete(id);
          resolve(event.data);
        }
      };
      workerInstance.onerror = () => {
        workerFailed = true;
        workerInstance?.terminate();
        workerInstance = null;
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return workerInstance;
}

function scheduleIdleFallback<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(() => resolve(fn()), { timeout: 50 });
    } else {
      setTimeout(() => resolve(fn()), 0);
    }
  });
}

export function chooseAiMoveAsync(
  state: GameStateSnapshot,
  aiPlayer: PlayerId,
  botId: string
): Promise<LegalMove | null> {
  const worker = getAiWorker();
  if (!worker) {
    return scheduleIdleFallback(() => chooseAiMove(state, aiPlayer, botId));
  }
  const id = reqSeq++;
  return new Promise((resolve) => {
    pendingResolvers.set(id, (data) => {
      resolve((data as { move: LegalMove | null }).move);
    });
    worker.postMessage({ id, kind: 'move', state, aiPlayer, botId });
  });
}

export function chooseAiNyumbaDecisionAsync(
  state: GameStateSnapshot,
  aiPlayer: PlayerId,
  botId?: string
): Promise<'stop' | 'continue'> {
  const worker = getAiWorker();
  if (!worker) {
    return scheduleIdleFallback(() => chooseAiNyumbaDecision(state, aiPlayer, botId));
  }
  const id = reqSeq++;
  return new Promise((resolve) => {
    pendingResolvers.set(id, (data) => {
      resolve((data as { decision: 'stop' | 'continue' }).decision);
    });
    worker.postMessage({ id, kind: 'nyumba', state, aiPlayer, botId });
  });
}
