import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import https from 'https'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')

  return {
    plugins: [
      react(),
      // Inline API plugin — handles /api/seed without a separate backend
      {
        name: 'seed-api',
        configureServer(server) {
          server.middlewares.use('/api/seed', (req, res) => {
            if (req.method !== 'POST') {
              res.writeHead(405)
              res.end('Method Not Allowed')
              return
            }

            let body = ''
            req.on('data', (chunk: Buffer) => { body += chunk.toString() })
            req.on('end', () => {
              let topic = ''
              let purpose = 'brainstorm'
              try {
                const parsed = JSON.parse(body)
                topic = parsed.topic ?? ''
                purpose = parsed.purpose ?? 'brainstorm'
              } catch {
                res.writeHead(400)
                res.end('Bad JSON')
                return
              }

              const apiKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''
              if (!apiKey || apiKey.startsWith('sk-ant-...') || apiKey === '') {
                // Return a fallback when no key is configured
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(buildFallback(topic)))
                return
              }

              const systemPrompt = `You are a mind map generator. Given a topic and purpose, generate a structured mind map with a root node, 5-6 first-level branch nodes, and 2 sub-nodes per branch.

IMPORTANT RULES:
- All labels must be DIRECTLY and SPECIFICALLY relevant to the given topic
- No generic labels like "Core Concepts" or "Key Questions" — make them topic-specific
- Branch nodes should represent real, meaningful dimensions of the topic
- Sub-nodes should be concrete aspects, examples, or questions within their branch
- For purpose="${purpose}", angle the map accordingly:
  - brainstorm: diverse angles, creative connections, what-ifs
  - research: key facts, debates, evidence, sources to check
  - planning: goals, steps, blockers, resources
  - learning: fundamentals, advanced concepts, common misconceptions

Respond ONLY with valid JSON in this exact format:
{
  "rootLabel": "string",
  "branches": [
    {
      "label": "string",
      "subNodes": ["string", "string"]
    }
  ]
}`

              const userPrompt = `Topic: "${topic}"
Purpose: ${purpose}

Generate a specific, insightful mind map. Every label must be directly about this topic.`

              const requestBody = JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
              })

              const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'Content-Length': Buffer.byteLength(requestBody),
                },
              }

              const apiReq = https.request(options, (apiRes) => {
                let data = ''
                apiRes.on('data', (chunk: Buffer) => { data += chunk.toString() })
                apiRes.on('end', () => {
                  try {
                    const parsed = JSON.parse(data)
                    const text = parsed.content?.[0]?.text ?? ''
                    // Extract JSON from the response
                    const jsonMatch = text.match(/\{[\s\S]*\}/)
                    if (!jsonMatch) throw new Error('No JSON in response')
                    const mapData = JSON.parse(jsonMatch[0])
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify(mapData))
                  } catch (e) {
                    console.error('[seed-api] parse error:', e)
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify(buildFallback(topic)))
                  }
                })
              })

              apiReq.on('error', (e: Error) => {
                console.error('[seed-api] request error:', e.message)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(buildFallback(topic)))
              })

              apiReq.write(requestBody)
              apiReq.end()
            })
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
    },
  }
})

// Fallback when no API key — generates passable topic-aware labels
function buildFallback(topic: string): { rootLabel: string; branches: Array<{ label: string; subNodes: string[] }> } {
  const t = topic.trim()
  return {
    rootLabel: t,
    branches: [
      { label: `What is ${t}?`, subNodes: ['Definition', 'History & origins'] },
      { label: `Why does ${t} matter?`, subNodes: ['Real-world impact', 'Who is affected?'] },
      { label: `How does ${t} work?`, subNodes: ['Key mechanisms', 'Step-by-step process'] },
      { label: `Challenges in ${t}`, subNodes: ['Main obstacles', 'Unsolved problems'] },
      { label: `Future of ${t}`, subNodes: ['Emerging trends', 'Open questions'] },
      { label: `Perspectives on ${t}`, subNodes: ['Supporting views', 'Counterarguments'] },
    ],
  }
}
