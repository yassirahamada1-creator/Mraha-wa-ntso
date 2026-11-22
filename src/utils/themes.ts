import type { BoardThemeId, ProgressionState } from '../types/app';

export interface BoardThemeConfig {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  materialTag: string;
  unlockHint: string;
  isUnlocked: (prog: ProgressionState) => boolean;
  bgGradient: string;
  boardFrameClass: string;
  boardOverlayColor: string;
  useWoodPhoto: boolean;
  innerRowClass: string;
  outerRowClass: string;
  campOppClass: string;
  campPlayerClass: string;
  dividerClass: string;
  pitBasePlayerClass: string;
  pitBaseOppClass: string;
  cupRadialBg: string;
  seedGradientClass: string;
  seedHighlightHex: string;
  patternMotif: 'none' | 'geometric' | 'ripples' | 'chiromani';
}

export const BOARD_THEMES: BoardThemeConfig[] = [
  {
    id: 'mahogany',
    name: 'Acajou & Lagon',
    subtitle: 'Bois sculpté, ocre chaud & mer des Comores',
    materialTag: 'Bois & Océan',
    unlockHint: 'Disponible dès le départ',
    isUnlocked: () => true,
    bgGradient: 'from-[#16100C] via-[#1C130D] to-[#110B07]',
    boardFrameClass: 'border-[#D99B38]/75 bg-[#5E361B]',
    boardOverlayColor: 'bg-[#3F2210]/20',
    useWoodPhoto: true,
    innerRowClass: 'bg-[#F2B441]/10',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#0B393E]/42 border-[#2DD4BF]/35',
    campPlayerClass: 'bg-[#D99B38]/18 border-[#F2B441]/45',
    dividerClass: 'from-[#2DD4BF]/65 via-[#F2B441] to-[#2DD4BF]/65',
    pitBasePlayerClass: 'ring-1 ring-[#F2B441]/40',
    pitBaseOppClass: 'ring-1 ring-[#2DD4BF]/30',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #6C3E1F 0%, #4A2712 58%, #2E1709 100%)',
    seedGradientClass: 'from-[#FAF6E4] via-[#CBD4AE] to-[#68764D]',
    seedHighlightHex: '#F2B441',
    patternMotif: 'none',
  },
  {
    id: 'stone',
    name: 'Basalte & Turquoise',
    subtitle: 'Pierre volcanique du Karthala',
    materialTag: 'Pierre',
    unlockHint: 'Disponible dès le départ',
    isUnlocked: () => true,
    bgGradient: 'from-[#12171A] via-[#171E22] to-[#0E1214]',
    boardFrameClass: 'border-[#2DD4BF]/45 bg-[#2A3339]',
    boardOverlayColor: 'bg-gradient-to-br from-[#37424A]/35 via-[#252D33]/40 to-[#1A2024]/55',
    useWoodPhoto: false,
    innerRowClass: 'bg-[#2DD4BF]/8',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#0D3A42]/45 border-[#2DD4BF]/38',
    campPlayerClass: 'bg-[#D99B38]/16 border-[#F2B441]/42',
    dividerClass: 'from-[#2DD4BF]/70 via-[#FFF7E8] to-[#F2B441]/70',
    pitBasePlayerClass: 'ring-1 ring-[#F2B441]/40',
    pitBaseOppClass: 'ring-1 ring-[#2DD4BF]/32',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #47525A 0%, #2D353B 58%, #1A1F23 100%)',
    seedGradientClass: 'from-[#F9F3DF] via-[#C8CEAF] to-[#6A7357]',
    seedHighlightHex: '#F2B441',
    patternMotif: 'ripples',
  },
  {
    id: 'chiromani',
    name: 'Tissu Chiromani',
    subtitle: 'Motifs rouges et ivoire des Comores',
    materialTag: 'Tissu comorien',
    unlockHint: 'Disponible dès le départ',
    isUnlocked: () => true,
    bgGradient: 'from-[#3B1418] via-[#280D10] to-[#1A080A]',
    boardFrameClass: 'border-[#E8C58E] bg-[#8E1C24]',
    boardOverlayColor: 'bg-[#5A1217]/30',
    useWoodPhoto: false,
    innerRowClass: 'bg-[#FFF3DC]/14',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#1C0608]/28 border-[#F2B441]/30',
    campPlayerClass: 'bg-[#2ED193]/10 border-[#FFE29E]/35',
    dividerClass: 'from-[#FFD275]/75 via-[#FFF7E8] to-[#FFD275]/75',
    pitBasePlayerClass: 'ring-1 ring-[#FFE29E]/55',
    pitBaseOppClass: 'ring-1 ring-[#F2B441]/35',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #753425 0%, #4E1E16 58%, #2E100B 100%)',
    seedGradientClass: 'from-[#FFF9EA] via-[#D0D8B4] to-[#65724E]',
    seedHighlightHex: '#FFD275',
    patternMotif: 'chiromani',
  },
  {
    id: 'lightwood',
    name: 'Bois de Teck',
    subtitle: 'Tablier doré ensoleillé',
    materialTag: 'Bois clair',
    unlockHint: '1 victoire ou 2 défis réussis',
    isUnlocked: (prog) => prog.wins >= 1 || prog.solvedChallengeIds.length >= 2,
    bgGradient: 'from-[#5A3D22] via-[#432B17] to-[#2E1D0E]',
    boardFrameClass: 'border-[#E6BA7A] bg-[#BC8447]',
    boardOverlayColor: 'bg-[#9E6B36]/12',
    useWoodPhoto: true,
    innerRowClass: 'bg-[#FFE4B5]/18',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#2A1809]/22 border-[#F2B441]/25',
    campPlayerClass: 'bg-[#2ED193]/10 border-[#64EBB6]/35',
    dividerClass: 'from-[#F2B441]/70 via-[#FFF5DC] to-[#F2B441]/70',
    pitBasePlayerClass: 'ring-1 ring-[#FFF3D1]/45',
    pitBaseOppClass: 'ring-1 ring-[#FFF3D1]/25',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #9C6836 0%, #724720 56%, #4F2F13 100%)',
    seedGradientClass: 'from-[#FCF8EA] via-[#C6D1A8] to-[#66734E]',
    seedHighlightHex: '#FFD275',
    patternMotif: 'geometric',
  },
  {
    id: 'ebony',
    name: 'Ébène Gravé',
    subtitle: 'Sculpture sombre & filigranes dorés',
    materialTag: 'Bois précieux',
    unlockHint: '3 parties jouées ou 5 défis',
    isUnlocked: (prog) => prog.completedGames >= 3 || prog.solvedChallengeIds.length >= 5,
    bgGradient: 'from-[#332E2B] via-[#24201E] to-[#191614]',
    boardFrameClass: 'border-[#DFA84E]/80 bg-[#3B332E]',
    boardOverlayColor: 'bg-[#2B2420]/25',
    useWoodPhoto: false,
    innerRowClass: 'bg-[#F2B441]/10',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#120F0E]/35 border-[#E5A93C]/22',
    campPlayerClass: 'bg-[#2ED193]/8 border-[#64EBB6]/30',
    dividerClass: 'from-[#E5A93C]/70 via-[#FFE4AE] to-[#E5A93C]/70',
    pitBasePlayerClass: 'ring-1 ring-[#E5A93C]/45',
    pitBaseOppClass: 'ring-1 ring-[#FFF7E8]/22',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #473E38 0%, #2C2622 58%, #1A1614 100%)',
    seedGradientClass: 'from-[#F9F3DF] via-[#C8CEAF] to-[#6A7357]',
    seedHighlightHex: '#E5A93C',
    patternMotif: 'geometric',
  },
  {
    id: 'sand',
    name: 'Sable & Plage',
    subtitle: 'Cuvettes creusées sur la côte',
    materialTag: 'Sable corallien',
    unlockHint: '5 parties jouées ou 8 défis',
    isUnlocked: (prog) => prog.completedGames >= 5 || prog.solvedChallengeIds.length >= 8,
    bgGradient: 'from-[#524230] via-[#3E3224] to-[#2C2319]',
    boardFrameClass: 'border-[#EED5AC] bg-[#D8B884]',
    boardOverlayColor: 'bg-[#B38E58]/10',
    useWoodPhoto: false,
    innerRowClass: 'bg-[#FFF5DE]/22',
    outerRowClass: 'bg-transparent',
    campOppClass: 'bg-[#362614]/20 border-[#F2B441]/30',
    campPlayerClass: 'bg-[#2ED193]/12 border-[#42F5AE]/35',
    dividerClass: 'from-[#D99B58]/80 via-[#FFF8EA] to-[#D99B58]/80',
    pitBasePlayerClass: 'ring-1 ring-[#FFF5DE]/50',
    pitBaseOppClass: 'ring-1 ring-[#FFF5DE]/25',
    cupRadialBg:
      'radial-gradient(circle at 34% 28%, #AD8A59 0%, #86663C 56%, #624929 100%)',
    seedGradientClass: 'from-[#EFF4E8] via-[#AEB99E] to-[#5D6852]',
    seedHighlightHex: '#F2B441',
    patternMotif: 'ripples',
  },
];

export function getBoardTheme(id: BoardThemeId): BoardThemeConfig {
  return BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];
}
