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

export { idGenerator }
