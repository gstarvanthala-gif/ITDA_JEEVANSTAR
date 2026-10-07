export const RISK_QUESTIONS = [
  {
    id: 'investmentHorizon',
    prompt: 'When might you need this simulated investment?',
    options: [
      { id: 'underOneYear', label: 'Within 1 year' },
      { id: 'oneToThreeYears', label: 'In 1 to 3 years' },
      { id: 'threeToFiveYears', label: 'In 3 to 5 years' },
      { id: 'fiveToTenYears', label: 'In 5 to 10 years' },
      { id: 'overTenYears', label: 'In more than 10 years' },
    ],
  },
  {
    id: 'marketDrop',
    prompt: 'If a simulated investment fell 20% over a short period, what would you most likely do?',
    options: [
      { id: 'sellAll', label: 'Sell all of it to avoid further losses' },
      { id: 'sellSome', label: 'Sell some and keep the rest' },
      { id: 'wait', label: 'Wait until the value stabilizes' },
      { id: 'stayInvested', label: 'Stay invested and review my plan' },
      { id: 'addMore', label: 'Consider adding more at the lower value' },
    ],
  },
  {
    id: 'priority',
    prompt: 'Which outcome best matches your priority for this simulation?',
    options: [
      { id: 'preserve', label: 'Avoiding losses, even if growth is limited' },
      { id: 'steady', label: 'Small, steady changes with limited ups and downs' },
      { id: 'balanced', label: 'A balance between stability and growth' },
      { id: 'growth', label: 'Long-term growth, accepting some fluctuations' },
      { id: 'maximumGrowth', label: 'Highest possible growth, accepting large fluctuations' },
    ],
  },
  {
    id: 'experience',
    prompt: 'How familiar are you with investment concepts?',
    options: [
      { id: 'none', label: 'Not familiar yet' },
      { id: 'basic', label: 'I know a few basic terms' },
      { id: 'some', label: 'I understand common investment types' },
      { id: 'good', label: 'I have compared different investment risks' },
      { id: 'advanced', label: 'I am comfortable evaluating varied risks' },
    ],
  },
  {
    id: 'volatilityComfort',
    prompt: 'How comfortable are you with short-term changes in simulated value?',
    options: [
      { id: 'veryUncomfortable', label: 'Very uncomfortable' },
      { id: 'uncomfortable', label: 'Somewhat uncomfortable' },
      { id: 'neutral', label: 'Neither comfortable nor uncomfortable' },
      { id: 'comfortable', label: 'Somewhat comfortable' },
      { id: 'veryComfortable', label: 'Very comfortable' },
    ],
  },
];

// Fixed scoring table: each answer scores 0, 5, 10, 15, or 20; five answers total 0-100.
export const RISK_SCORING_TABLE = {
  investmentHorizon: {
    underOneYear: 0,
    oneToThreeYears: 5,
    threeToFiveYears: 10,
    fiveToTenYears: 15,
    overTenYears: 20,
  },
  marketDrop: {
    sellAll: 0,
    sellSome: 5,
    wait: 10,
    stayInvested: 15,
    addMore: 20,
  },
  priority: {
    preserve: 0,
    steady: 5,
    balanced: 10,
    growth: 15,
    maximumGrowth: 20,
  },
  experience: {
    none: 0,
    basic: 5,
    some: 10,
    good: 15,
    advanced: 20,
  },
  volatilityComfort: {
    veryUncomfortable: 0,
    uncomfortable: 5,
    neutral: 10,
    comfortable: 15,
    veryComfortable: 20,
  },
};