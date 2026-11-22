import type { UiLanguage } from '../types/app';

export interface UiStrings {
  appTitle: string;
  subtitle: string;
  playVsAi: string;
  playDuo: string;
  playOnline: string;
  resumeMatch: string;
  levels: {
    easy: string;
    medium: string;
    hard: string;
  };
  hud: {
    reserve: string;
    captures: string;
    board: string;
  };
  victory: {
    titleWin: string;
    titleLose: string;
    titleDraw: string;
    replay: string;
    share: string;
    home: string;
  };
  menu: {
    resume: string;
    tutorial: string;
    puzzles: string;
    rules: string;
    settings: string;
    hideNyumba: string;
    restart: string;
    quit: string;
  };
  tutorial: {
    playNow: string;
    next: string;
    stepHold: string;
    stepSlide: string;
    stepCapture: string;
    stepNyumba: string;
  };
  online: {
    title: string;
    createGame: string;
    joinGame: string;
    invite: string;
    invitedCopied: string;
    copyCode: string;
    copied: string;
    waitingOpponent: string;
    enterCode: string;
    joinBtn: string;
  };
}

export const UI_STRINGS: Record<UiLanguage, UiStrings> = {
  fr: {
    appTitle: 'Mraha wa Tso',
    subtitle: '',
    playVsAi: 'Jouer contre l’ordi',
    playDuo: '2 joueurs · Sur place',
    playOnline: '1v1 en ligne',
    resumeMatch: 'Reprendre',
    levels: {
      easy: 'Apprenti',
      medium: 'Confirmé',
      hard: 'Maître',
    },
    hud: {
      reserve: 'Réserve',
      captures: 'Prises',
      board: 'Tablier',
    },
    victory: {
      titleWin: 'Victoire',
      titleLose: 'Défaite',
      titleDraw: 'Égalité',
      replay: 'Rejouer',
      share: 'Partager',
      home: 'Accueil',
    },
    menu: {
      resume: 'Reprendre',
      tutorial: 'Défis',
      puzzles: 'Défis',
      rules: 'Règles',
      settings: 'Réglages',
      hideNyumba: 'Cacher Nyumba',
      restart: 'Recommencer',
      quit: 'Accueil',
    },
    tutorial: {
      playNow: 'Jouer',
      next: 'Suivant',
      stepHold: 'Maintenir',
      stepSlide: 'Glisser',
      stepCapture: 'Capturer',
      stepNyumba: 'Protéger',
    },
    online: {
      title: 'Jouer en ligne',
      createGame: 'Créer une partie',
      joinGame: 'Rejoindre',
      invite: 'Envoyer sur WhatsApp',
      invitedCopied: 'Lien copié !',
      copyCode: 'Copier le code',
      copied: 'Code copié !',
      waitingOpponent: 'En attente de l’adversaire…',
      enterCode: 'Code à 6 chiffres',
      joinBtn: 'Rejoindre la partie',
    },
  },
};

export function getStoredLanguage(): UiLanguage {
  return 'fr';
}

export function saveStoredLanguage(_lang: UiLanguage): void {
  // Application uniquement en français
}
