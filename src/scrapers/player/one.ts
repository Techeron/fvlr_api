// Fetches details on a single player

// External Libs
import { load } from 'cheerio'
import { idGenerator, getAgentArray } from '../util'
import {
  AgentStats,
  PlayerAgentStats,
  Player,
  timeEnum,
} from '../../schemas/schemas'

const fetchOnePlayer = async (id: string) => {
  console.log(`Fetching players ${id}`)
  // Validate input
  // make sure id is a string of numbers
  id = id.replace(/\s/g, '')
  if (!id.match(/^[0-9,]+/gm)) throw new Error('Invalid ID')
  if (!id.match(/^[0-9,]+/)) throw new Error(`Invalid ID: ${id}`)
  let idArray = id.split(',')
  let PromiseArray: Promise<Player>[] = new Array()
  for (let i = 0; i < idArray.length; i++) {
    PromiseArray.push(fetchPlayer(idArray[i]))
  }
  return Promise.all(PromiseArray)
}

export const fetchPlayer = async (id: string): Promise<Player> => {
  const agentArray = await getAgentArray()
  console.log(`Fetched ${agentArray.length} agents`)
  // check if id is intern
  if (id[0] === '0') {
    id = id.replace(/^[0]+/gm, '')
  }
  return new Promise(async (resolve, reject) => {
    // fetch the page
    fetch(`https://www.vlr.gg/player/${id}`)
      .then((response) => response.text())
      .then((data) => {
        // parse the page
        const $ = load(data)
        // Check for the 404 string
        if (
          $('#wrapper > .col-container > div:first-child')
            .text()
            .includes('Page not found')
        )
          reject('404')

        let Player = new Object() as Player
        Player.ign = $('h1.wf-title').text().trim()
        Player.name = Player.ign
        Player.realName = $('h2.player-real-name').text().trim()
        Player.id = idGenerator(id)
        Player.link = `https://www.vlr.gg/player/${id}`
        Player.photo = cleanPhoto($('.player-header img').attr('src') || '')
        Player.country = cleanCountry(
          $('.player-header .ge-text-light').text().trim()
        )
        Player.team =
          $('div.player-summary-container-1 > div:nth-child(6) > a')
            .attr('href')
            ?.split('/')[2] ?? undefined
        if (Player.team) Player.team = idGenerator(Player.team)
        Player.role = $('.profile-role').text().trim()
        Player.earnings = $(
          '.player-summary-container-2 .wf-card:nth-child(4) span'
        )
          .text()
          .trim()
          ?.split('\n')[0]

        Player.stats = new Object() as PlayerAgentStats
        // Generate Player Stats
        const statsTable = $('table.wf-table').first()
        const statRows = $(statsTable).find('tbody tr')
        const statLabels = $(statsTable).find('th')
        // Create array of stat labels
        const statLabelsArray: string[] = []
        $(statLabels).each((i, element) => {
          if (i == 0) statLabelsArray.push('Agent')
          else statLabelsArray.push($(element).text().trim())
        })
        Player.stats.time = timeEnum.Enum.t60
        Player.stats.data = new Array()
        // itterate through each row in the table (default t60)
        $(statRows).each((i, element) => {
          // Create a new object for each row
          Player.stats.data[i] = new Object() as AgentStats
          // itterate through each td in the row and add it to the playerStats object
          $(element)
            .find('td')
            .each((j, element) => {
              const statLabel = statLabelsArray[j] as keyof AgentStats
              let statValue
              if (statLabel == 'Agent')
                statValue = ($(element).find('img').attr('src') || '')
                  .split('/')[5]
                  .split('.')[0]
              else if (statLabel == 'Use')
                statValue = $(element).text().trim().split(' ')[0]
              else statValue = $(element).text().trim()
              Player.stats.data[i][statLabel] = statValue
            })
        })
        // Add the agent array for stats
        Player.agentStats = new Object() as Player['agentStats']
        for (let i = 0; i < agentArray.length; i++) {
          const agentName = agentArray[i] as keyof Player['agentStats']

          Player.agentStats[agentName] = new Object() as AgentStats
          // Add the agent stats with no data
          for (let j = 0; j < statLabelsArray.length; j++) {
            const statsLabel = statLabelsArray[j] as keyof AgentStats

            if (statsLabel == 'Agent')
              Player.agentStats[agentName]['Agent'] = agentName
            Player.agentStats[agentName][statsLabel] = '0'
          }
        }
        // Add the agent stats with data
        Player.stats.data.forEach((element, i) => {
          const agent = element.Agent as keyof Player['agentStats']
          for (let j = 0; j < statLabelsArray.length; j++) {
            const statLabel = statLabelsArray[j] as keyof AgentStats
            if (statLabel == 'Agent') continue

            Player.agentStats[agent][statLabel] =
              Player.stats.data[i][statLabel]
          }
        })
        console.log(`Fetched player ${Player.ign} (${Player.id})`)
        resolve(Player)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
const cleanCountry = (country: string) => {
  try {
    country = country.split('\n')[2].replace(/[\n,\t]/g, '')
  } catch {
    country = ''
  }
  return country
}
const cleanPhoto = (photo: string) => {
  if (photo === undefined) return ''
  if (photo.includes('owcdn.net')) photo = `https:${photo}`
  else photo = ''
  return photo.replace(/[\n,\t]/g, '')
}

export { fetchOnePlayer }
