import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AnalysisData {
  clientName: string
  packageType: string
  goals: string
  activePlan: string
  workoutSummary: string
  nutritionSummary: string
  bodyLogSummary: string
  checkinSummary: string
  cyclePhaseSummary: string
  goalAdherenceSummary: string
}

export async function generateAnalysis(data: AnalysisData): Promise<string> {
  const prompt = `You are a certified personal trainer and nutrition coach analyzing a client's 4-week progress.

Client: ${data.clientName}
Package: ${data.packageType}
Goals: ${data.goals}

Current plan:
${data.activePlan || 'No active plan set.'}

Week-by-week data:
- Workouts: ${data.workoutSummary}
- Nutrition averages: ${data.nutritionSummary}
- Body composition: ${data.bodyLogSummary}
- Daily check-ins (energy/mood/sleep): ${data.checkinSummary}
- Cycle phases this period: ${data.cyclePhaseSummary}
- Nutrition goal adherence: ${data.goalAdherenceSummary}

Provide:
1. Progress summary (2-3 sentences, warm and specific)
2. Top 2-3 improvement areas with reasoning
3. Suggested plan adjustments (specific, actionable)
4. Encouragement close (1 sentence)

Tone: encouraging, direct, data-grounded. Like a knowledgeable friend, not a textbook.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}
