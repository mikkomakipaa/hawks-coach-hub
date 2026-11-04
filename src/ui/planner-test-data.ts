import type { Drill } from '@/types/drills';

export interface PlannerRecentDrill {
  id: string;
  title: string;
  category: string;
  durationLabel: string;
  summary: string;
}

const MOCK_TIMESTAMP = '2026-02-28T10:00:00.000Z';

export const PLANNER_TEST_DRILLS: Drill[] = [
  {
    id: 'drill_corner-battle',
    slug: 'corner-battle',
    title: 'Kulmataistelu',
    summary: 'Nopea 1v1 kamppailu kulmasta kiekon suojaamiseen ja irtautumiseen.',
    description: 'Kulmapainotteinen 1v1-harjoite, jossa korostuu ensikosketus ja suunnanmuutos.',
    category: 'Laukaukset',
    intensityLevel: 'high',
    ageGroups: ['U12', 'U14'],
    skillTags: ['1v1', 'kulmapeli', 'laukaus'],
    durationMin: 12,
    playerCountMin: 6,
    playerCountMax: 10,
    equipment: ['Kiekot', 'Kartio'],
    coachingPoints: ['Suojauksen ensiasento', 'Katse irti kulmasta ennen laukausta'],
    progressionIdeas: ['Lisää toinen puolustaja'],
    variationIdeas: ['Aloitus eri kulmista'],
    status: 'published',
    sourceType: 'native',
    attachmentIds: ['attachment_1'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: 'drill_triangle-pass',
    slug: 'triangle-pass',
    title: 'Kolmiosyotto paineella',
    summary: 'Kolmen pelaajan rytmitetty syottoralli, jossa mukaan tulee nopeasti puolustava varjo.',
    description: 'Perussyottoharjoite, joka toimii hyvin alkulammittelyssa ja kiekollisen pelin herattajana.',
    category: 'Syottaminen',
    intensityLevel: 'medium',
    ageGroups: ['U12', 'U14', 'U16'],
    skillTags: ['syotto', 'liike', 'tempo'],
    durationMin: 10,
    playerCountMin: 6,
    playerCountMax: 12,
    equipment: ['Kiekot'],
    coachingPoints: ['Syottosuunta auki ennen vastaanottoa', 'Liiku syoton jalkeen'],
    progressionIdeas: ['Yksi kosketus viimeiseen pisteeseen'],
    variationIdeas: ['Vaihdettava aloitussuunta'],
    status: 'published',
    sourceType: 'native',
    attachmentIds: ['attachment_2'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: 'drill_2v2-defence',
    slug: '2v2-defence',
    title: '2v2 puolustuskaista',
    summary: 'Pienpeliharjoite puolustusvastuun ajoitukseen ja keskustan sulkemiseen.',
    description: 'Puolustava 2v2, jossa valmentaja voi keskeyttaa nopeasti opetushetkea varten.',
    category: 'Puolustus',
    intensityLevel: 'high',
    ageGroups: ['U14', 'U16'],
    skillTags: ['2v2', 'puolustus', 'peliasento'],
    durationMin: 15,
    playerCountMin: 8,
    playerCountMax: 12,
    equipment: ['Kiekot', 'Liivit'],
    coachingPoints: ['Maila syottolinjalle', 'Sulje keskikaista ensin'],
    progressionIdeas: ['Nopea kaanto hyokkaykseen'],
    variationIdeas: ['Lisaa kulmasta tukea'],
    status: 'published',
    sourceType: 'native',
    attachmentIds: ['attachment_3'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: 'drill_small-area-game',
    slug: 'small-area-game',
    title: 'Pienpelin viimeistely',
    summary: 'Lopun kilpailullinen peli, jossa ratkaisut tehdään nopeasti maalinedustalla.',
    description: 'Lyhyt ja intensiivinen lopputreenin peli, joka sopii myos siirtymaksi sisaisen kilpailun paatokselle.',
    category: 'Pelit',
    intensityLevel: 'high',
    ageGroups: ['U12', 'U14', 'U16'],
    skillTags: ['pienpeli', 'viimeistely', 'reaktio'],
    durationMin: 18,
    playerCountMin: 8,
    playerCountMax: 14,
    equipment: ['Kiekot', 'Liivit', 'Maalit'],
    coachingPoints: ['Ratkaisu 2 sekunnissa', 'Maalinedustan reagointi'],
    progressionIdeas: ['Pakollinen syotto ennen laukausta'],
    variationIdeas: ['Pelaa kahdella kiekolla'],
    status: 'published',
    sourceType: 'native',
    attachmentIds: ['attachment_4'],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];

export const PLANNER_RECENT_DRILLS: PlannerRecentDrill[] = [
  {
    id: 'drill_corner-battle',
    title: 'Kulmataistelu',
    category: 'Laukaukset',
    durationLabel: '12 min',
    summary: 'Toimi viime viikolla U12-joukkueen avaavana kamppailuna.',
  },
  {
    id: 'drill_triangle-pass',
    title: 'Kolmiosyotto paineella',
    category: 'Syottaminen',
    durationLabel: '10 min',
    summary: 'Nopea alkuverkka, joka sopii suoraan testiversion builderiin.',
  },
  {
    id: 'drill_2v2-defence',
    title: '2v2 puolustuskaista',
    category: 'Puolustus',
    durationLabel: '15 min',
    summary: 'Hyva vaihto-osa, kun halutaan testata lohkojen uudelleenjarjestysta.',
  },
];

export function getPlannerDrillCategories(): string[] {
  return [...new Set(PLANNER_TEST_DRILLS.map(drill => drill.category))].sort((left, right) =>
    left.localeCompare(right, 'fi'),
  );
}
