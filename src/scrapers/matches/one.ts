// Fetches details on a single event

// External Libs
import { load } from 'cheerio'
import { idGenerator, timeToUTC } from '../util'
// Schema
import { z } from '@hono/zod-openapi'
import {
  ExtStats,
  Game,
  MatchSchema,
  PlayerMatchStatsElement,
  PlayerStats,
  GameTeamExtended,
  statusEnum,
  typeEnum,
} from '../../schemas/schemas'
// Types
export type Match = z.infer<typeof MatchSchema>

const fetchOneMatch = async (id: string): Promise<Match> => {
  return new Promise(async (resolve, reject) => {
    // fetch the page
    fetch(`https://www.vlr.gg/${id}`)
      .then((response) => response.text())
      .then((data) => {
        // parse the page
        let $ = load(data)
        const Match: Match = new Object() as Match
        Match.type = typeEnum.Enum.Match
        Match.id = id
        Match.date = $('.match-header-date .moment-tz-convert:nth-child(1)')
          .text()
          .trim()
        Match.time = $('.match-header-date .moment-tz-convert:nth-child(2)')
          .text()
          .trim()
        Match.eventId =
          $('.match-header-super a.match-header-event')
            .attr('href')
            ?.split('/')[2] || '0'
        Match.eventName = $(
          '.match-header-super a.match-header-event div > div:nth-child(1)'
        )
          .text()
          .trim()
        Match.logo =
          'https:' +
            $('.match-header-super a.match-header-event img').attr('src') || ''

        // Get Match Streams
        Match.streams = new Array()
        $('.match-streams .match-streams-btn').each((i, element) => {
          if ($(element).attr('href')) {
            Match.streams.push({
              name: $(element).text().trim(),
              link: $(element).attr('href') || '',
            })
          } else {
            Match.streams.push({
              name: $(element).text().trim(),
              link: $(element).find('a').attr('href') || '',
            })
          }
        })

        Match.status = statusEnum.Enum.Upcoming
        if (
          $('.match-header-vs-score > .match-header-vs-note:first-child')
            .text()
            .trim() == 'final'
        ) {
          Match.status = statusEnum.Enum.Completed
        }

        Match.games = new Array()
        Match.teams = new Array()
        Match.players = new Array()

        // Scores
        const MapScore = new Array()
        MapScore.push(
          $('.match-header-vs .match-header-vs-score span')
            .first()
            .text()
            .trim()
        )
        MapScore.push(
          $('.match-header-vs .match-header-vs-score span').last().text().trim()
        )
        // Set Match Teams
        const TeamContainers = $('.match-header-vs .wf-title-med')
        TeamContainers.each((i, element) => {
          Match.teams.push({
            name: $(element).text().trim(),
            id: idGenerator(
              $(element).parent().parent().attr('href')?.split('/')[2] || ''
            ),
            score: MapScore[i],
          })
        })

        // Getting Match Stats
        const StatsContainer = $(
          ".vm-stats-container .vm-stats-game[data-game-id!='all']"
        )
        $(StatsContainer).each((i, element) => {
          Match.games[i] = new Object() as Game

          const map = $(element)
            .find('.map')
            .text()
            .trim()
            .split('\t')[0]
            .trim()
          // TODO: make map a enum
          Match.games[i].map = map
          Match.games[i].teams = new Array()
          Match.games[i].teams[0] = new Object() as GameTeamExtended
          Match.games[i].teams[1] = new Object() as GameTeamExtended
          Match.games[i].teams[0].name = Match.teams[0].name
          Match.games[i].teams[1].name = Match.teams[1].name
          const team0Score = $(element).find(`div.team:first-of-type`)
          Match.games[i].teams[0].scoreAdvanced = {
            t: Number($(team0Score).find('.mod-t').text().trim()),
            ct: Number($(team0Score).find('.mod-ct').text().trim()),
            ot: Number($(team0Score).find('.mod-ot').text().trim()),
          }
          Match.games[i].teams[0].score = Number(
            $(team0Score).find('.score').text().trim()
          )
          const team1Score = $(element).find(`div.team:last-of-type`)

          Match.games[i].teams[1].scoreAdvanced = {
            t: Number($(team1Score).find('.mod-t').text().trim()),
            ct: Number($(team1Score).find('.mod-ct').text().trim()),
            ot: Number($(team1Score).find('.mod-ot').text().trim()),
          }
          Match.games[i].teams[1].score = Number(
            $(team1Score).find('.score').text().trim()
          )
          Match.games[i].teams[0].players = new Array()
          Match.games[i].teams[1].players = new Array()

          // Just add players to the Match Players array
          if (i == 0) {
            const PlayerContainers = $(element).find(
              '.wf-table-inset.mod-overview tr'
            )
            PlayerContainers.each((index, element) => {
              if (
                $(element)
                  .find('.mod-player a div:nth-child(1)')
                  .text()
                  .trim() == ''
              )
                return
              const player = new Object() as PlayerMatchStatsElement
              player.name = $(element)
                .find('.mod-player a div:nth-child(1)')
                .text()
                .trim()
              player.team = $(element)
                .find('.mod-player a div:nth-child(2)')
                .text()
                .trim()
              player.link = `https://www.vlr.gg${$(element)
                .find('.mod-player a')
                .attr('href')}`
              const playerStats = $(element).find('.mod-stat')
              player.statsAdvanced = new Object() as ExtStats
              player.stats = new Object() as PlayerStats
              playerStats.each((i, element) => {
                const ct = $(element).find('.mod-ct').text().trim()
                const t = $(element).find('.mod-t').text().trim()
                const ot = $(element).find('.mod-ot').text().trim()
                const both = $(element).find('.mod-both').text().trim()
                const data = {
                  ct: ct,
                  t: t,
                  ot: ot,
                }
                switch (i) {
                  case 0:
                    player.statsAdvanced.kdr = data
                    player.stats.kdr = both
                    break
                  case 1:
                    player.statsAdvanced.acs = data
                    player.stats.acs = both
                    break
                  case 2:
                    player.statsAdvanced.k = data
                    player.stats.k = both
                    break
                  case 3:
                    player.statsAdvanced.d = data
                    player.stats.d = both
                    break
                  case 4:
                    player.statsAdvanced.a = data
                    player.stats.a = both
                    break
                  case 5:
                    player.statsAdvanced.kdb = data
                    player.stats.kdb = both
                    break
                  case 6:
                    player.statsAdvanced.kast = data
                    player.stats.kast = both
                    break
                  case 7:
                    player.statsAdvanced.adr = data
                    player.stats.adr = both
                    break
                  case 8:
                    player.statsAdvanced.hs = data
                    player.stats.hs = both
                    break
                  case 9:
                    player.statsAdvanced.fk = data
                    player.stats.fk = both
                    break
                  case 10:
                    player.statsAdvanced.fd = data
                    player.stats.fd = both
                    break
                  case 11:
                    player.statsAdvanced.fkdb = data
                    player.stats.fkdb = both
                    break
                  default:
                    break
                }
              })
              Match.players.push(player)
            })
          } else {
            // Add Logic for 2nd event to merge into first one
          }
        })

        Match.datetimeiso = timeToUTC(Match.date, Match.time)
        console.log('Match Pulled: ' + Match.id)
        resolve(Match)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export { fetchOneMatch }
