import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyErrorRightUndo,
  confirmTurnAfterTrakatra,
  createInitialGameState,
  DEFAULT_RULE_CONFIG,
  doesPhase2MoveCapture,
  executeMove,
  getAllowedLoopDirsForPit,
  getGamePhase,
  getInnerRowSeeds,
  getLegalMoves,
  getNyumbaCoord,
  getPlayerBoardSeeds,
  getTotalGameSeeds,
  hasMandatoryCaptureInTurn,
  resolveNyumbaChoice,
  type GameStateSnapshot,
  type MrahaRuleConfig,
} from './mrahaEngine.ts';

function createCustomState(
  overrides: Omit<Partial<GameStateSnapshot>, 'config'> & { config?: Partial<MrahaRuleConfig> }
): GameStateSnapshot {
  const base = createInitialGameState(0, overrides.config);
  return {
    ...base,
    ...overrides,
    config: { ...DEFAULT_RULE_CONFIG, ...(overrides.config || {}) },
  };
}

test('1. Position de départ exacte (10 graines par joueur, nyumba=6, 2+2, 22 en réserve, total=64)', () => {
  const state = createInitialGameState(0);

  assert.equal(getTotalGameSeeds(state), 64);
  assert.equal(getGamePhase(state), 1);
  assert.deepEqual(state.reserves, [22, 22]);
  assert.equal(getPlayerBoardSeeds(state.board, 0), 10);
  assert.equal(getPlayerBoardSeeds(state.board, 1), 10);

  // J1 (bas, row 2) : colonne 5 (idx 4) = 6 (nyumba), colonnes 6 et 7 (idx 5, 6) = 2 et 2, coin col 8 (idx 7) = 0
  assert.equal(state.board[2][4], 6);
  assert.equal(state.board[2][5], 2);
  assert.equal(state.board[2][6], 2);
  assert.equal(state.board[2][7], 0);
  assert.equal(getNyumbaCoord(0).row, 2);
  assert.equal(getNyumbaCoord(0).col, 4);

  // J2 (haut, row 1) : colonne 4 (idx 3) = 6 (nyumba), colonnes 3 et 2 (idx 2, 1) = 2 et 2, coin col 1 (idx 0) = 0
  assert.equal(state.board[1][3], 6);
  assert.equal(state.board[1][2], 2);
  assert.equal(state.board[1][1], 2);
  assert.equal(state.board[1][0], 0);
  assert.equal(getNyumbaCoord(1).row, 1);
  assert.equal(getNyumbaCoord(1).col, 3);
});

test('2. Interdiction de commencer par la Nyumba au premier coup', () => {
  const state = createInitialGameState(0);

  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 4), []);
  assert.throws(() => executeMove(state, 0, 2, 4, 1));

  // Les deux cases adjacentes (col 6 et 7 en base 1 -> idx 5 et 6) sont autorisées
  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 5), [1, -1]);
  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 6), [1, -1]);

  // Même chose si J2 commence
  const stateP2 = createInitialGameState(1);
  assert.deepEqual(getAllowedLoopDirsForPit(stateP2, 1, 1, 3), []);
});

test('3. Prise obligatoire en Phase 1 et en Phase 2 (Ndrazi : min 2 graines, MAX_NDRAZI=15, jamais 1 seul ntso)', () => {
  // Phase 1 : J1 a une case bi-pleine en col 3 (idx 2) face à J2 col 3 (idx 2)
  const p1CaptureState = createCustomState({
    turnCount: 2,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 4, 6, 0, 0, 0, 0],
      [0, 0, 1, 0, 6, 2, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    reserves: [20, 20],
  });
  assert.equal(hasMandatoryCaptureInTurn(p1CaptureState, 0), true);
  // Impossible de jouer la case non bi-pleine (idx 5) quand prise obligatoire
  assert.deepEqual(getAllowedLoopDirsForPit(p1CaptureState, 0, 2, 5), []);
  assert.ok(getAllowedLoopDirsForPit(p1CaptureState, 0, 2, 2).length > 0);

  // Phase 2 : un seul ntso (1 graine) en (2, 1) NE PEUT PAS déclencher de Ndrazi même face à J2 (1, 2)=3
  const p2SingletonCannotNdrazi = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 3, 0, 0, 0, 0, 0],
      [0, 1, 2, 0, 0, 5, 0, 0], // (2,1) = 1 (interdit) ; (2,2) et (2,5) jouent donc en trakatra
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  assert.equal(
    doesPhase2MoveCapture(p2SingletonCannotNdrazi.board, 0, 2, 1, 1, DEFAULT_RULE_CONFIG),
    false
  );
  assert.equal(hasMandatoryCaptureInTurn(p2SingletonCannotNdrazi, 0), false);
  assert.deepEqual(getAllowedLoopDirsForPit(p2SingletonCannotNdrazi, 0, 2, 1), []);
  assert.deepEqual(getAllowedLoopDirsForPit(p2SingletonCannotNdrazi, 0, 2, 5), [1, -1]);

  // Phase 2 : Ndrazi valide avec au minimum 2 graines en (2, 0)=2 semé +1 vers (2, 2) occupée face à J2 (1, 2)=3
  const p2NdraziMinTwo = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 3, 0, 0, 0, 0, 0],
      [2, 0, 2, 0, 0, 5, 0, 0], // (2,0) = 2 -> +1 atterrit sur (2,2) non vide face à (1,2)=3
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  assert.equal(hasMandatoryCaptureInTurn(p2NdraziMinTwo, 0), true);
  assert.deepEqual(getAllowedLoopDirsForPit(p2NdraziMinTwo, 0, 2, 0), [1]);
  assert.deepEqual(getAllowedLoopDirsForPit(p2NdraziMinTwo, 0, 2, 5), []);

  // MAX_NDRAZI = 15 : une case à 17 graines (atterrit sur (2,3) non vide) ne peut PAS déclencher de ndrazi
  const bigPitBoard = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 3, 0, 0, 0, 0],
    [0, 0, 17, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];
  assert.equal(
    doesPhase2MoveCapture(bigPitBoard, 0, 2, 2, 1, { ...DEFAULT_RULE_CONFIG, maxNdrazi: 15 }),
    false
  );
  assert.equal(
    doesPhase2MoveCapture(bigPitBoard, 0, 2, 2, 1, { ...DEFAULT_RULE_CONFIG, maxNdrazi: null }),
    true
  );
});

test('4. Capture : coin de départ et sens selon la colonne capturée (1-2, 7-8, 3-6)', () => {
  // Cas c=2 (idx 1) : commence au coin col 1 (idx 0) en sens +1
  const stateCol2 = createCustomState({
    turnCount: 2,
    reserves: [18, 18],
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 0, 6, 0, 0, 0, 0],
      [0, 2, 0, 0, 6, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  // Capture en col 2 (idx 1) de 3 graines -> semées en (2,0), (2,1), (2,2)
  const { nextState: resCol2 } = executeMove(stateCol2, 0, 2, 1, 1, true, false);
  assert.equal(resCol2.board[1][1], 0); // case adverse vidée
  assert.equal(resCol2.board[2][0], 1); // coin col 1 reçoit 1ère graine
  assert.equal(resCol2.board[2][1], 4); // 2 + 1(réserve) + 1(capturée) = 4
  assert.equal(resCol2.board[2][2], 1); // arrêt sur case vide

  // Cas c=7 (idx 6) : commence au coin col 8 (idx 7) en sens -1
  // Avec 1 graine capturée en (1,6), elle tombe dans le coin (2,7) qui était vide -> arrêt direct
  const stateCol7 = createCustomState({
    turnCount: 2,
    reserves: [18, 18],
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 6, 0, 0, 1, 0],
      [0, 0, 0, 0, 6, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  const { nextState: resCol7 } = executeMove(stateCol7, 0, 2, 6, -1, true, false);
  assert.equal(resCol7.board[1][6], 0);
  assert.equal(resCol7.board[2][7], 1); // coin col 8 reçoit la graine capturée
  assert.equal(resCol7.board[2][6], 2); // 1 + 1(réserve) = 2 (conservées sur place)

  // Cas c=4 (idx 3, entre 3 et 6) : Phase 1 choix libre +1 ou -1
  const stateCol4 = createCustomState({
    turnCount: 2,
    reserves: [18, 18],
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 0, 1, 6, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  assert.deepEqual(getAllowedLoopDirsForPit(stateCol4, 0, 2, 3), [1, -1]);
  const { nextState: resCol4Left } = executeMove(stateCol4, 0, 2, 3, -1, true, false);
  // En sens -1 depuis col 4 -> commence au coin col 8 (idx 7), sème 2 graines en idx 7 et idx 6
  assert.equal(resCol4Left.board[2][7], 1);
  assert.equal(resCol4Left.board[2][6], 1);
});

test('5. Trakatra : jamais de capture en cours de relais même si on atterrit sur une case bi-pleine', () => {
  const trakatraState = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0], // J2 a 4 graines en col 5 (idx 4)
      [2, 0, 1, 0, 1, 0, 0, 0], // Aucun ndrazi direct au départ ; (2,0)=2 -> (2,2)=1->2 -> relais -> (2,4)=1->2 (bi-pleine!) => relais, PAS capture!
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });

  assert.equal(hasMandatoryCaptureInTurn(trakatraState, 0), false);
  const { nextState } = executeMove(trakatraState, 0, 2, 0, 1, true, false);
  // La case adverse (1,4) est restée intacte à 4 graines : aucune capture !
  assert.equal(nextState.board[1][4], 4);
  assert.equal(nextState.captures[0], 0);
});

test('6. Interdiction de jouer un singleton (gumwen) pour démarrer un trakatra en Phase 2', () => {
  const state = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 2, 0],
      [1, 0, 0, 0, 3, 0, 0, 0], // (2,0)=1 singleton interdit, (2,4)=3 autorisé
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });

  assert.equal(hasMandatoryCaptureInTurn(state, 0), false);
  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 0), []);
  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 4), [1, -1]);
});

test('7. En Phase 2 Trakatra, priorité absolue aux cases >= 2 de la rangée interne sur la rangée externe', () => {
  const state = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 2, 0],
      [0, 2, 0, 0, 0, 0, 0, 0], // interne a (2,1)=2
      [0, 0, 4, 0, 0, 0, 0, 0], // externe a (3,2)=4 mais bloquée tant que interne a >=2
    ],
  });

  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 2, 1), [1, -1]);
  assert.deepEqual(getAllowedLoopDirsForPit(state, 0, 3, 2), []);

  // Si la rangée interne n'a qu'un singleton (1 graine), la rangée externe (>=2) devient jouable
  const stateOnlySingletonInner = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 2, 0],
      [0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 4, 0, 0, 0, 0, 0],
    ],
  });
  assert.deepEqual(getAllowedLoopDirsForPit(stateOnlySingletonInner, 0, 3, 2), [1, -1]);
});

test('8. Phase 1 Nyumba : arrêt facultatif en arrivant dans sa nyumba intacte + exception solo à 2 graines', () => {
  // 8a. Arrêt vs Continuer en arrivant dans la Nyumba intacte
  const stateLandingNyumba = createCustomState({
    turnCount: 2,
    reserves: [18, 18],
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 6, 0, 0, 0, 0],
      [0, 0, 1, 0, 6, 0, 0, 0], // (2,2)=1 -> +1 réserve = 2 graines semées +1 -> (2,3), (2,4=nyumba!)
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  const { nextState: paused } = executeMove(stateLandingNyumba, 0, 2, 2, 1, true, true);
  assert.ok(paused.pendingNyumbaChoice !== null);
  assert.equal(paused.board[2][4], 7);
  assert.equal(paused.nyumbaIntact[0], true);

  // Choix 1 : S'arrêter -> nyumba reste intacte à 7 graines
  const { nextState: stopped } = resolveNyumbaChoice(paused, 'stop', true, true);
  assert.equal(stopped.nyumbaIntact[0], true);
  assert.equal(stopped.board[2][4], 7);
  assert.equal(stopped.currentTurn, 1);

  // Choix 2 : Continuer -> nyumba vidée et perd son statut intact
  const { nextState: continued } = resolveNyumbaChoice(paused, 'continue', true, true);
  assert.equal(continued.nyumbaIntact[0], false);
  assert.equal(continued.currentTurn, 1);

  // 8b. Seule case non vide de la rangée interne en Phase 1 = Nyumba intacte -> on ne prend que 2 graines
  const stateSoloNyumba = createCustomState({
    turnCount: 4,
    reserves: [16, 16],
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 6, 0, 0, 0, 0],
      [0, 0, 0, 0, 8, 0, 0, 0], // Seule la nyumba contient des graines en interne
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  assert.deepEqual(getAllowedLoopDirsForPit(stateSoloNyumba, 0, 2, 4), [1, -1]);
  const { nextState: afterSolo } = executeMove(stateSoloNyumba, 0, 2, 4, 1, true, false);
  // 8 + 1 (réserve) - 2 (semées) = 7 graines restées dans la nyumba intacte !
  assert.equal(afterSolo.board[2][4], 7);
  assert.equal(afterSolo.board[2][5], 1);
  assert.equal(afterSolo.board[2][6], 1);
  assert.equal(afterSolo.nyumbaIntact[0], true);
});

test('9. Droit à l’erreur : annule exactement le trakatra Phase 2, force le sens inverse, et une seule fois par tour', () => {
  const state = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 2, 0, 0],
      [0, 0, 2, 0, 0, 0, 0, 0], // J1 joue (2,2)=2 en sens +1
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });

  const { nextState: afterTrakatra } = executeMove(state, 0, 2, 2, 1, true, true);
  assert.ok(afterTrakatra.pendingErrorUndo !== null);
  assert.equal(afterTrakatra.board[2][2], 0);
  assert.equal(afterTrakatra.board[2][4], 1);

  // On utilise le Droit à l'erreur -> plateau restauré et sens forcé = -1
  const undone = applyErrorRightUndo(afterTrakatra);
  assert.deepEqual(undone.board, state.board);
  assert.equal(undone.currentTurn, 0);
  assert.equal(undone.forcedRetryDir, -1);
  assert.equal(undone.usedErrorRightThisTurn, true);

  // Seul le sens inverse (-1) est autorisé pour rejouer
  assert.deepEqual(getAllowedLoopDirsForPit(undone, 0, 2, 2), [-1]);
  assert.throws(() => executeMove(undone, 0, 2, 2, 1, true, true));

  // Rejouer en sens -1 termine le tour SANS offrir un second Droit à l'erreur
  const { nextState: finalTurn } = executeMove(undone, 0, 2, 2, -1, true, true);
  assert.equal(finalTurn.pendingErrorUndo, null);
  assert.equal(finalTurn.currentTurn, 1);

  // Vérifie aussi confirmTurnAfterTrakatra si on ne veut pas annuler
  const confirmed = confirmTurnAfterTrakatra(afterTrakatra);
  assert.equal(confirmed.pendingErrorUndo, null);
  assert.equal(confirmed.currentTurn, 1);
});

test('10. Détection de fin de partie (KAMU) : rangée interne vidée, blocage, ou uniquement des singletons', () => {
  // 10a. Vider la dernière graine de la rangée interne adverse = KAMU immédiat (avec un ndrazi à 2 graines)
  const almostEmptyOpp = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0, 0, 0, 0], // dernière case interne de J2 en col 3 (idx 2)
      [2, 0, 1, 0, 0, 0, 0, 0], // J1 sème (2,0)=2 -> (2,2) capture (1,2)=2 -> J2 interne vide!
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  const { nextState: kamuWin } = executeMove(almostEmptyOpp, 0, 2, 0, 1, true, false);
  assert.equal(kamuWin.winner, 0);
  assert.equal(getInnerRowSeeds(kamuWin.board, 1), 0);

  // 10b. Adversaire uniquement avec des singletons (même adjacents !) = KAMU car 1 ntso ne peut ni ndrazi ni trakatra
  const oppSingletonsOnly = createCustomState({
    reserves: [0, 0],
    turnCount: 30,
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0], // J2 n'a que des 1 même adjacents -> aucun ndrazi (>=2 requis), aucun trakatra
      [0, 0, 2, 0, 0, 0, 0, 0], // J1 joue un trakatra vers (2,4) sans nourrir J2
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  });
  const { nextState: blockedWin } = executeMove(oppSingletonsOnly, 0, 2, 2, 1, true, false);
  assert.equal(blockedWin.winner, 0);
  assert.ok(blockedWin.winReason?.includes('Kamu'));
});

test('11. Invariant 64 graines sur une partie complète + option SKIP_START_ON_LOOP', () => {
  let state = createInitialGameState(0);
  let safety = 0;

  while (state.winner === null && safety < 250) {
    safety++;
    const moves = getLegalMoves(state, state.currentTurn);
    assert.ok(moves.length > 0, `Aucun coup légal au tour ${safety}`);
    const chosen = moves[safety % moves.length];
    const { nextState } = executeMove(
      state,
      state.currentTurn,
      chosen.row,
      chosen.col,
      chosen.loopDir,
      false,
      false
    );
    state = nextState;
    assert.equal(getTotalGameSeeds(state), 64, `Invariant 64 graines brisé au tour ${safety}`);
  }

  // Test explicite de config.skipStartOnLoop sur une case de >= 16 graines
  const loopBoard = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [16, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];
  // Sans saut : 16 graines font un tour complet et retombent sur (2,0) vide -> arrêt sans relais
  const sNoSkip = createCustomState({
    reserves: [0, 0],
    board: loopBoard,
    config: { skipStartOnLoop: false, maxNdrazi: 15 },
  });
  const { nextState: rNoSkip } = executeMove(sNoSkip, 0, 2, 0, 1, false, false);
  assert.equal(rNoSkip.board[2][0], 1);
  assert.equal(rNoSkip.lastMove?.relaysCount, 0);

  // Avec saut : la 16e graine saute (2,0) et retombe sur (2,1) déjà à 1 graine -> déclenche une chaîne de relais
  const sSkip = createCustomState({
    reserves: [0, 0],
    board: loopBoard,
    config: { skipStartOnLoop: true, maxNdrazi: 15 },
  });
  const { nextState: rSkip } = executeMove(sSkip, 0, 2, 0, 1, false, false);
  assert.ok((rSkip.lastMove?.relaysCount ?? 0) > 0);
  assert.equal(rSkip.board[2][2], 2);
});
