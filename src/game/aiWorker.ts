import {
  chooseAiMove,
  chooseAiNyumbaDecision,
} from './mrahaAi';
import type { GameStateSnapshot, LegalMove, PlayerId } from './mrahaEngine';

type AiWorkerRequest =
  | {
      id: number;
      kind: 'move';
      state: GameStateSnapshot;
      aiPlayer: PlayerId;
      botId: string;
    }
  | {
      id: number;
      kind: 'nyumba';
      state: GameStateSnapshot;
      aiPlayer: PlayerId;
      botId?: string;
    };

type AiWorkerResponse =
  | { id: number; kind: 'move'; move: LegalMove | null }
  | { id: number; kind: 'nyumba'; decision: 'stop' | 'continue' };

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const req = event.data;
  if (req.kind === 'move') {
    const move = chooseAiMove(req.state, req.aiPlayer, req.botId);
    const res: AiWorkerResponse = { id: req.id, kind: 'move', move };
    self.postMessage(res);
  } else {
    const decision = chooseAiNyumbaDecision(req.state, req.aiPlayer, req.botId);
    const res: AiWorkerResponse = { id: req.id, kind: 'nyumba', decision };
    self.postMessage(res);
  }
};
