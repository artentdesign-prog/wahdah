export interface Question {
  id: string;
  text: string;
  clues?: string[];
  optional?: boolean;
}

export interface Round {
  id: number;
  title: string;
  tag: string;
  time: number;
  questions: Question[];
}

export interface Step {
  t: 'intro' | 'q' | 'board' | 'winner' | 'final';
  r?: number;
  q?: number;
}

export interface Team {
  id: number;
  name: string;
  adj: number;
}

export interface QuestionEdit {
  text?: string;
  answer?: string;
  hint?: string;
  time?: number;
}

export interface AppState {
  page: 'home' | 'how' | 'setup' | 'play';
  step: number;
  teams: Team[];
  nextId: number;
  awards: Record<string, Record<number, boolean>>; // qid -> { tid: true }
  revealed: Record<string, boolean>; // qid -> boolean
  hint: Record<string, boolean>; // qid -> boolean
  clues: Record<string, number>; // qid -> count shown
  bonus: Record<string, boolean>; // qid -> boolean
  edits: Record<string, QuestionEdit>;
  timers: Record<string, number>;
  muted: boolean;
  panel: boolean;
}

export const ROUNDS: Round[] = [
  {
    id: 1,
    title: 'The First Clue',
    tag: 'Every great mystery begins with a single clue.',
    time: 30,
    questions: [
      { id: 'r1q1', text: 'What has hands but cannot clap?' },
      { id: 'r1q2', text: 'The more you take, the more you leave behind. What are they?' },
      { id: 'r1q3', text: 'What can speak without a mouth and hear without ears?' },
      { id: 'r1q4', text: 'What has cities but no houses, forests but no trees, and rivers but no water?' },
      { id: 'r1q5', text: 'What belongs to you but other people use it more than you do?' },
      { id: 'r1q6', text: 'What gets wetter the more it dries?' },
      { id: 'r1q7', text: 'What has a neck but no head?' },
      { id: 'r1q8', text: 'What has keys but cannot open a single lock?' },
      { id: 'r1q9', text: 'What runs but never walks, and has a mouth but never talks?' },
      { id: 'r1q10', text: 'What can you catch but never throw?' }
    ]
  },
  {
    id: 2,
    title: 'The Mind Trap',
    tag: 'Read slowly. The trap is in the words.',
    time: 45,
    questions: [
      { id: 'r2q1', text: 'A farmer has 17 sheep. All but 9 run away. How many remain?' },
      { id: 'r2q2', text: 'How many times does the letter M appear in “minute” and “moment” together?' },
      { id: 'r2q3', text: 'If you overtake the person in second place in a race, what position are you in?' },
      { id: 'r2q4', text: 'Two fathers and two sons catch 3 fish. Each gets one fish. How is this possible?' },
      { id: 'r2q5', text: 'Which is heavier: 1 kg of iron or 1 kg of cotton?' },
      { id: 'r2q6', text: 'How many months of the year have 28 days?' },
      { id: 'r2q7', text: 'A doctor gives you 3 pills and says to take one every half hour. How long until all the pills are taken?' },
      { id: 'r2q8', text: 'How many animals of each kind did Moses take on the Ark?' },
      { id: 'r2q9', text: 'A plane crashes exactly on the border of two countries. Where do they bury the survivors?' },
      { id: 'r2q10', text: 'What is half of 2 + 2?' }
    ]
  },
  {
    id: 3,
    title: 'The Hidden Identity',
    tag: 'Clues arrive one at a time. Guess early, score the same.',
    time: 60,
    questions: [
      { id: 'r3q1', text: 'Who am I?', clues: ['Born in 1869.', 'Known for non-violence.', 'Called the Father of the Nation.'] },
      { id: 'r3q2', text: 'Who am I?', clues: ['Born in 1931.', 'An aerospace scientist.', 'A former President of India.', 'Known as the Missile Man.'] },
      { id: 'r3q3', text: 'Who am I?', clues: ['A German-born physicist.', 'Famous for the theory of relativity.', 'Author of E = mc².'] },
      { id: 'r3q4', text: 'Who am I?', clues: ['An Indian mathematician.', 'Born in 1887.', 'Famous for extraordinary mathematical discoveries.'] },
      { id: 'r3q5', text: 'Who am I?', clues: ['An Urdu poet.', 'Wrote “Sare Jahan Se Achha.”'] },
      { id: 'r3q6', text: 'Who am I?', clues: ['Born in 1861.', 'The first non-European to win the Nobel Prize in Literature.', 'Wrote “Gitanjali”.', 'Wrote the words of India’s national anthem.'] },
      { id: 'r3q7', text: 'Who am I?', clues: ['Born in 1910 in Skopje.', 'Won the Nobel Peace Prize in 1979.', 'Founded the Missionaries of Charity.', 'Spent her life serving the poor in Kolkata.'] },
      { id: 'r3q8', text: 'Who am I?', clues: ['Born in 1973.', 'An Indian cricketer.', 'Nicknamed the “Master Blaster”.', 'Scored 100 international centuries.'] },
      { id: 'r3q9', text: 'Who am I?', clues: ['An Italian polymath, born in 1452.', 'Painted the “Mona Lisa”.', 'Sketched flying machines centuries before aeroplanes.'] },
      { id: 'r3q10', text: 'Who am I?', clues: ['Born in Poland in 1867.', 'Discovered polonium and radium.', 'The first woman to win a Nobel Prize.', 'Won Nobel Prizes in two different sciences.'] }
    ]
  },
  {
    id: 4,
    title: 'Crack the Code',
    tag: 'Numbers lie less than words. Usually.',
    time: 60,
    questions: [
      { id: 'r4q1', text: 'Decode using A=1, B=2, C=3 … Z=26:  20 – 18 – 21 – 20 – 8' },
      { id: 'r4q2', text: 'Complete the sequence:  2, 6, 12, 20, 30, __' },
      { id: 'r4q3', text: 'Decode using A=1, B=2, C=3 … Z=26:  8 – 9 – 4 – 4 – 5 – 14' },
      { id: 'r4q4', text: 'Which number is different?  2, 3, 5, 7, 9, 11' },
      { id: 'r4q5', text: 'Complete the sequence:  A, C, F, J, O, __' },
      { id: 'r4q6', text: 'Decode using A=1, B=2, C=3 … Z=26:  19 – 5 – 3 – 18 – 5 – 20' },
      { id: 'r4q7', text: 'Complete the sequence:  1, 4, 9, 16, 25, __' },
      { id: 'r4q8', text: 'Which number is different?  121, 144, 169, 200, 225' },
      { id: 'r4q9', text: 'Decode using A=1, B=2, C=3 … Z=26:  3 – 12 – 21 – 5' },
      { id: 'r4q10', text: 'Complete the sequence:  1, 1, 2, 3, 5, 8, __' }
    ]
  },
  {
    id: 5,
    title: 'The Final Mystery',
    tag: 'Everything you have seen tonight leads here.',
    time: 40,
    questions: [
      { id: 'r5q1', text: 'I am always in front of you, but you can never see me. What am I?' },
      { id: 'r5q2', text: 'What has one eye but cannot see?' },
      { id: 'r5q3', text: 'What disappears as soon as you say its name?' },
      { id: 'r5q4', text: 'What can fill a room but takes up no space?' },
      { id: 'r5q6', text: 'What gets bigger the more you take away from it?' },
      { id: 'r5q7', text: 'What can travel all around the world while staying in one corner?' },
      { id: 'r5q8', text: 'What has many teeth but cannot bite?' },
      { id: 'r5q9', text: 'What goes up but never comes down?' },
      { id: 'r5q10', text: 'I have no voice, yet I tell you stories. What am I?' },
      { id: 'r5q5', text: 'What is the one thing everyone has, but nobody can lose?', optional: true }
    ]
  }
];

export const ANSWER_KEY: Record<string, string> = {
  r1q1: 'A clock',
  r1q2: 'Footsteps',
  r1q3: 'An echo',
  r1q4: 'A map',
  r1q5: 'Your name',
  r1q6: 'A towel',
  r1q7: 'A bottle',
  r1q8: 'A piano (or a keyboard)',
  r1q9: 'A river',
  r1q10: 'A cold',

  r2q1: '9',
  r2q2: '3',
  r2q3: 'Second',
  r2q4: 'They are a grandfather, a father and a son',
  r2q5: 'They weigh the same',
  r2q6: 'All 12 (every month has at least 28 days)',
  r2q7: '1 hour (first pill now, second after 30 min, third after 60 min)',
  r2q8: 'None. It was Noah, not Moses',
  r2q9: 'Nowhere. Survivors are not buried',
  r2q10: '3 (half of 2 is 1, then 1 + 2 = 3)',

  r3q1: 'Mahatma Gandhi',
  r3q2: 'A. P. J. Abdul Kalam',
  r3q3: 'Albert Einstein',
  r3q4: 'Srinivasa Ramanujan',
  r3q5: 'Allama Iqbal',
  r3q6: 'Rabindranath Tagore',
  r3q7: 'Mother Teresa',
  r3q8: 'Sachin Tendulkar',
  r3q9: 'Leonardo da Vinci',
  r3q10: 'Marie Curie',

  r4q1: 'TRUTH',
  r4q2: '42',
  r4q3: 'HIDDEN',
  r4q4: '9 (the only number that is not prime)',
  r4q5: 'U',
  r4q6: 'SECRET',
  r4q7: '36',
  r4q8: '200 (the only number that is not a perfect square)',
  r4q9: 'CLUE',
  r4q10: '13',

  r5q1: 'The future',
  r5q2: 'A needle',
  r5q3: 'Silence',
  r5q4: 'Light',
  r5q6: 'A hole',
  r5q7: 'A stamp',
  r5q8: 'A comb',
  r5q9: 'Your age',
  r5q10: 'A book',
  r5q5: 'Their identity (optional question: accept only if the quizmaster allows it; a shadow is not correct)'
};

export const HINTS: Record<string, string> = {
  r1q1: 'Look at the wall. It never stops moving.',
  r1q2: 'Think about walking along a beach.',
  r1q3: 'Shout in a canyon and listen.',
  r1q4: 'You will find one in an atlas.',
  r1q5: 'Your friends call you by it all day.',
  r1q6: 'You use it after a bath.',
  r1q7: 'You will find one on a dining table.',
  r1q8: 'Musicians press them.',
  r1q9: 'It flows from the hills to the sea.',
  r1q10: 'It makes you sneeze.',

  r2q1: 'Read carefully: “all but 9”.',
  r2q2: 'Count each word separately, then add.',
  r2q3: 'You have taken someone else’s place.',
  r2q4: 'Count how many people are actually there.',
  r2q5: 'Same weight. Only the size differs.',
  r2q6: 'Read the question again: “have 28 days”, not “only 28 days”.',
  r2q7: 'When do you take the first pill?',
  r2q8: 'Who built the Ark?',
  r2q9: 'Read the word “survivors” slowly.',
  r2q10: 'Do the half first, then add.',

  r3q1: 'He led the Salt March.',
  r3q2: 'He wrote “Wings of Fire”.',
  r3q3: 'Nobel Prize in Physics, 1921.',
  r3q4: 'A film was made about his life: “The Man Who Knew Infinity”.',
  r3q5: 'His famous poem praises Hindustan.',
  r3q6: 'People call him Gurudev.',
  r3q7: 'She was awarded the Bharat Ratna in 1980.',
  r3q8: 'He wore the number 10 jersey.',
  r3q9: 'He also painted “The Last Supper”.',
  r3q10: 'Polonium is named after her homeland.',

  r4q1: 'The 20th letter is T.',
  r4q2: 'Look at the gaps: 4, 6, 8, 10 …',
  r4q3: 'H is the 8th letter.',
  r4q4: 'Think about prime numbers.',
  r4q5: 'The gap between letters grows by one each time.',
  r4q6: 'The 19th letter is S.',
  r4q7: 'These are square numbers.',
  r4q8: 'Think about 11 × 11, 12 × 12 …',
  r4q9: 'It is something you have been collecting all night.',
  r4q10: 'Add the two numbers before it.',

  r5q1: 'You will meet it tomorrow.',
  r5q2: 'It is used for sewing.',
  r5q3: 'Say it and it is gone.',
  r5q4: 'Switch it on.',
  r5q6: 'Think about digging.',
  r5q7: 'You stick it on a letter.',
  r5q8: 'You use it every morning.',
  r5q9: 'Every birthday adds one.',
  r5q10: 'You turn my pages.',
  r5q5: 'It can change as you grow, but it cannot be taken away.'
};

export const SCORING = {
  base: 10,
  bonus: 20,
  hintPenalty: 5
};

export const RULES = [
  'Divide the class into 4–6 teams.',
  'Each team must choose a team name.',
  'Teams must write answers instead of shouting.',
  'No phones or internet searching.',
  'Each question has a time limit.',
  'One hint may be given in each round.',
  'The quizmaster’s decision is final.'
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const STEPS: Step[] = [];
ROUNDS.forEach((r, ri) => {
  STEPS.push({ t: 'intro', r: ri });
  r.questions.forEach((_q, qi) => {
    STEPS.push({ t: 'q', r: ri, q: qi });
  });
  STEPS.push({ t: 'board', r: ri });
});
STEPS.push({ t: 'winner' });
STEPS.push({ t: 'final' });
