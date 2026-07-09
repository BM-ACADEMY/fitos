const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

function age(dob) {
  if (!dob) return 25;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

const GENDER_RULES = `
GENDER + GOAL SPECIFIC RULES (apply strictly):
- Female + toning: higher reps (12-20), moderate weight, full-body circuits
- Female + pcod: LOW-IMPACT strength only, NO extreme HIIT, include yoga rest days (2 per week)
- Female + prenatal: no heavy lifts, no lying flat after week 16, pelvic floor focus
- Female + postnatal: pelvic floor first, gradual core rebuild, NO crunches, protein 1.6-1.8g/kg
- Male + muscle_gain: Push/Pull/Legs split, progressive overload, protein 1.8-2.2g/kg
- Male + strength: powerlifting movements, 3-6 rep heavy sets
- Beginners: fewer exercises, machine-based where possible, form notes on every exercise`;

async function generateWorkoutPlan(member) {
  const prompt = `You are an expert gym trainer in Tamil Nadu, India. Create a 7-day workout plan.

MEMBER:
- Name: ${member.name}
- Gender: ${member.gender || 'male'}
- Age: ${age(member.dob)}
- Goal: ${member.goal || 'fitness'}
- Fitness level: ${member.fitness_level || 'beginner'}
- Health notes: ${member.health_notes || 'None'}
${GENDER_RULES}

Return ONLY valid JSON. No markdown, no backticks, no text before or after. Structure:
{
  "weekly_plan": [
    { "day": "Monday", "focus": "...", "duration_mins": 60,
      "cardio": "...",
      "exercises": [ { "name": "...", "sets": 4, "reps": "10-12", "rest_seconds": 90, "notes": "..." } ] }
  ],
  "tips": ["...", "..."],
  "progression": "How to progress after 4 weeks"
}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

async function generateDietPlan(member) {
  const prompt = `You are a Tamil Nadu nutritionist. Create a 1-day meal plan template (repeatable weekly with variations).

MEMBER:
- Gender: ${member.gender || 'male'}, Age: ${age(member.dob)}
- Goal: ${member.goal || 'fitness'}
- Health notes: ${member.health_notes || 'None'}

REQUIREMENTS:
- Use Tamil / South Indian foods: idli, dosa, sambar, rasam, rice, pongal, keerai, kootu, fish curry, chicken gravy, curd rice, kozhukattai
- Provide BOTH veg_option and nonveg_option for every meal
- Meal times: 7AM breakfast, 10AM snack, 1PM lunch, 4PM snack, 8PM dinner
- Show calories and protein_g per meal

Return ONLY valid JSON. No markdown. Structure:
{
  "daily_calories_target": 2000,
  "daily_protein_target_g": 100,
  "meals": [
    { "time": "7:00 AM", "meal": "Breakfast",
      "veg_option": "...", "nonveg_option": "...",
      "calories": 400, "protein_g": 18 }
  ],
  "hydration": "...",
  "notes": ["...", "..."]
}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

module.exports = { generateWorkoutPlan, generateDietPlan };
