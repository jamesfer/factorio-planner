export interface Technology {
  name: string;
  requirements: string[];
  time: number;
  formula(n: number): number;
}

const technologies: Technology[] = [
  {
    name: 'Worker robot speed',
    time: 60,
    requirements: ['Red Science', 'Green Science', 'Blue Science'],
    formula: n => 1000 * 2 ** n,
  },
  {
    name: 'Mining productivity',
    time: 60,
    requirements: ['Red Science', 'Green Science', 'Blue Science'],
    formula: n => 2500 * n,
  },
  {
    name: 'Physical projectile damage',
    time: 60,
    requirements: ['Red Science', 'Green Science', 'Blue Science', 'Black Science'],
    formula: n => 1000 * 2 ** n,
  },
  {
    name: '',
    time: 60,
    requirements: ['Red Science', 'Green Science', 'Blue Science', 'Black Science'],
    formula: n => 1000 * 2 ** n,
  },
];
