export type MockSteamGame = {
  appId: number
  title: string
  developer: string
  publisher: string
  releaseDate: string
  shortDescription: string
  artworkOptions: string[]
}

export const mockSteamGames: MockSteamGame[] = [
  {
    appId: 620,
    title: 'Portal 2',
    developer: 'Valve',
    publisher: 'Valve',
    releaseDate: '2011',
    shortDescription: 'A first-person puzzle game built around portals, test chambers, and dark comedy.',
    artworkOptions: ['Header artwork', 'Capsule artwork', 'Logo', 'Screenshots'],
  },
  {
    appId: 220,
    title: 'Half-Life 2',
    developer: 'Valve',
    publisher: 'Valve',
    releaseDate: '2004',
    shortDescription: 'A story-driven first-person shooter set in a dystopian alien-occupied world.',
    artworkOptions: ['Header artwork', 'Capsule artwork', 'Logo', 'Screenshots'],
  },
  {
    appId: 413150,
    title: 'Stardew Valley',
    developer: 'ConcernedApe',
    publisher: 'ConcernedApe',
    releaseDate: '2016',
    shortDescription: 'A farming and life simulation game about restoring a neglected farm and joining a rural community.',
    artworkOptions: ['Header artwork', 'Capsule artwork', 'Logo', 'Screenshots'],
  },
  {
    appId: 1145360,
    title: 'Hades',
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    releaseDate: '2020',
    shortDescription: 'A roguelike action game about fighting out of the Underworld.',
    artworkOptions: ['Header artwork', 'Capsule artwork', 'Logo', 'Screenshots'],
  },
  {
    appId: 105600,
    title: 'Terraria',
    developer: 'Re-Logic',
    publisher: 'Re-Logic',
    releaseDate: '2011',
    shortDescription: 'A sandbox adventure game focused on exploration, crafting, building, and combat.',
    artworkOptions: ['Header artwork', 'Capsule artwork', 'Logo', 'Screenshots'],
  },
]
