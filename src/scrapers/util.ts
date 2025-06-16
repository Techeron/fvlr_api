import { client } from '..'

const idGenerator = function (id: string) {
  // Takes an id and returns a 16 character string of 0x000... + id
  try {
    if (!id.match(/^[0-9]+$/)) return '0'
    return id.padStart(15, '0')
  } catch (err) {
    console.log(id)
    return 'n/a'
  }
}

const timeToUTC = function (date: string, time: string): string | null {
  let dateObj: Date | null = null
  // Fix Match Time
  var timeZone = time.split(' ')[2]
  if (timeZone && timeZone.toUpperCase() !== 'UTC') {
    // check if year is in date
    const dateParts = date.split(' ')
    if (dateParts.length === 3) {
      date = `${date} ${new Date().getFullYear()}`
    }
    let dateString = `${date}, ${time}`
    dateObj = new Date(dateString)
    if (isNaN(dateObj.getTime())) {
      console.error(
        'Failed to parse the date string directly. Attempting a more robust method.'
      )

      // If direct parsing fails, you might need to reformat the string
      // or parse it manually. For this specific format, let's try
      // a common trick of removing the "th", "st", "nd", "rd" from the day.
      const cleanedDateString = dateString.replace(/(\d+)(st|nd|rd|th)/g, '$1') // Remove 'st', 'nd', 'rd', 'th'

      dateObj = new Date(cleanedDateString)

      if (isNaN(dateObj.getTime())) {
        console.error('Failed to parse even after cleaning the string.')
        // Fallback or more advanced parsing with a library like Moment.js or date-fns
        // would be needed here for very complex or inconsistent formats.
      } else {
        console.log(
          'Successfully parsed the date after cleaning: ' + cleanedDateString
        )
        console.log(dateObj.toISOString())
      }
    }
  }
  return dateObj?.toISOString() || null
}
// requests the api for the agents and returns an array of agent names
export async function getAgentArray(): Promise<string[]> {
  if (await client.exists('agents')) {
    console.info('Return Cached Agents')
    const agents = (await client.get('agents')) as string
    return JSON.parse(agents)
  } else {
    console.info('Cacheing Agents')
    const response = await fetch('https://valorant-api.com/v1/agents')
    const data = await response.json()
    const agents = data.data
      .map((agent: any) => agent.displayName.toLowerCase().replace('/', ''))
      .sort()
    await client.set('agents', JSON.stringify(agents), { EX: 60 * 60 * 24 * 7 })
    return agents
  }
}

export { idGenerator, timeToUTC }
