import { z } from '@hono/zod-openapi'

// Enums
export const regionsEnum = z.enum([
  'EU',
  'NA',
  'KR',
  'BR',
  'AP',
  'LATAM',
  'OCE',
])
export const typeEnum = z.enum(['Event', 'Match'])
export const statusEnum = z.enum(['Upcoming', 'Ongoing', 'Completed'])

// Util Objects
// Object for the stats of a player
const statsObject = z
  .object({
    kdr: z.string(),
    acs: z.string(),
    k: z.string(),
    d: z.string(),
    a: z.string(),
    kdb: z.string(),
    kast: z.string(),
    adr: z.string(),
    hs: z.string(),
    fk: z.string(),
    fd: z.string(),
    fkdb: z.string(),
  })
  .openapi({
    example: {
      kdr: '1.20',
      acs: '230',
      k: '29',
      d: '21',
      a: '6',
      kdb: '+8',
      kast: '69%',
      adr: '162',
      hs: '37%',
      fk: '2',
      fd: '2',
      fkdb: '0',
    },
  })
export type Stats = z.infer<typeof statsObject>

// Object for the stats of a player per site
const extStatsObject = z
  .object({
    kdr: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    acs: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    k: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    d: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    a: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    kdb: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    kast: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    adr: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    hs: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    fk: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    fd: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
    fkdb: z.object({
      ct: z.string(),
      t: z.string(),
      ot: z.string(),
    }),
  })
  .openapi({
    example: {
      kdr: {
        ct: '0.88',
        t: '1.51',
        ot: '',
      },
      acs: {
        ct: '127',
        t: '334',
        ot: '',
      },
      k: {
        ct: '7',
        t: '22',
        ot: '',
      },
      d: {
        ct: '11',
        t: '10',
        ot: '',
      },
      a: {
        ct: '2',
        t: '4',
        ot: '',
      },
      kdb: {
        ct: '-4',
        t: '+12',
        ot: '',
      },
      kast: {
        ct: '56%',
        t: '83%',
        ot: '',
      },
      adr: {
        ct: '108',
        t: '216',
        ot: '',
      },
      hs: {
        ct: '40%',
        t: '35%',
        ot: '',
      },
      fk: {
        ct: '0',
        t: '2',
        ot: '',
      },
      fd: {
        ct: '1',
        t: '1',
        ot: '',
      },
      fkdb: {
        ct: '-1',
        t: '+1',
        ot: '',
      },
    },
  })
export type ExtStats = z.infer<typeof extStatsObject>

// Schemas
const IDType = z
  .string()
  .min(1)
  .regex(/^[0-9]+$/) // Only numbers
  .openapi({
    example: '0 (1-16 characters)',
  })

const IDSchema = z.object({
  id: IDType,
})

const EventSchema = z
  .object({
    type: typeEnum.openapi({
      example: 'Event',
    }),
    id: IDType,
    link: z.string().openapi({
      example:
        'https://www.vlr.gg/event/1927/champions-tour-2023-china-ascension',
    }),
    name: z.string().openapi({
      example: 'Champions Tour 2023 China: Ascension',
    }),
    date: z.string().openapi({
      example: 'Dec 22—30',
    }),
    status: z
      .string()
      .regex(/New||Ongoing||Completed/)
      .openapi({
        example: 'completed',
      }),
    prize: z.string().openapi({
      example: '$250,000',
    }),
    region: regionsEnum.openapi({
      example: 'EU',
    }),
    logo: z.string().openapi({
      example: 'https://owcdn.net/img/6009f963577f4.png',
    }),
  })
  .array()

const TeamSchema = z.object({
  name: z.string().openapi({
    example: 'Team Liquid',
  }),
  id: z
    .string()
    .min(1)
    .regex(/^[0-9]+$/) // Only numbers
    .openapi({
      example: '000000000001927',
    }),
  mapScore: z.string().openapi({
    example: '13',
  }),
})
const GameSchema = z.object({
  map: z.string().openapi({
    example: 'Bind',
  }),
  teams: z.array(TeamSchema),
})
const StreamSchema = z.object({
  name: z.string(),
  link: z.string(),
})
const PlayerSchema = z.object({
  name: z.string(),
  link: z.string(),
})
// Schema for the /matches/{id} endpoint
const MatchSchema = z.object({
  type: typeEnum.openapi({
    example: 'Event',
  }),
  id: z
    .string()
    .min(1)
    .regex(/^[0-9]+$/) // Only numbers
    .openapi({
      example: '000000000001927',
    }),
  time: z.string(),
  event: z.string(), // ID or 0
  eventname: z.string(),
  streams: z.array(StreamSchema),
  players: z.array(PlayerSchema),
  games: z.array(GameSchema),
  teams: z.array(TeamSchema),
  link: z.string().openapi({
    example:
      'https://www.vlr.gg/event/1927/champions-tour-2023-china-ascension',
  }),
  name: z.string().openapi({
    example: 'Champions Tour 2023 China: Ascension',
  }),
  date: z.string().openapi({
    example: 'Dec 22—30',
  }),
  status: z
    .string()
    .regex(/New||Ongoing||Completed/)
    .openapi({
      example: 'completed',
    }),
  prize: z.string().openapi({
    example: '$250,000',
  }),
  region: regionsEnum.openapi({
    example: 'EU',
  }),
  logo: z.string().openapi({
    example: 'https://owcdn.net/img/6009f963577f4.png',
  }),
})
// Schema for the /matches endpoint
export const AllMatchSchema = z
  .object({
    date: z.string(),
    today: z.boolean(),
    matches: z.array(MatchSchema),
  })
  .array()

export { IDSchema, EventSchema, MatchSchema }
