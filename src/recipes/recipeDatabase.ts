import { keyBy } from "lodash";

export interface Recipe {
  name: string;
  time: number;
  yield: number;
  source: 'assembler' | 'mine' | 'chem' | 'furnace' | 'lab' | 'pump' | 'rocket silo' | 'none',
  requirements: {
    name: string;
    amount: number;
  }[];
}

export interface RecipeDatabase {
  [k: string]: Recipe;
}

const recipes: Recipe[] = [
  {
    name: 'Research',
    time: 60,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Blue Science', amount: 1 },
      { name: 'Red Science', amount: 1 },
      { name: 'Green Science', amount: 1 },
      { name: 'Black Science', amount: 1 },
      { name: 'Purple Science', amount: 1 },
      { name: 'Orange Science', amount: 1 },
      { name: 'White Science', amount: 1 },
    ],
  },
  {
    name: 'Rocket',
    time: 1,
    yield: 1,
    source: 'rocket silo',
    requirements: [
      { name: 'Rocket Part', amount: 100 },
    ],
  },
  {
    name: 'Research White Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'White Science', amount: 1 },
    ],
  },
  {
    name: 'White Science',
    time: 30,
    yield: 1000,
    source: 'rocket silo',
    requirements: [
      { name: 'Rocket Part', amount: 100 },
      { name: 'Satellite', amount: 1 },
    ],
  },
  {
    name: 'Satellite',
    time: 5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Accumulator', amount: 100 },
      { name: 'Low Density Structure', amount: 100 },
      { name: 'Blue Circuit', amount: 100 },
      { name: 'Radar', amount: 5 },
      { name: 'Rocket Fuel', amount: 50 },
      { name: 'Solar Panel', amount: 50 },
    ],
  },
  {
    name: 'Radar',
    yield: 1,
    time: 0.5,
    source: 'assembler',
    requirements: [
      { name: 'Green Circuit', amount: 5 },
      { name: 'Cog', amount: 5 },
      { name: 'Iron', amount: 10 },
    ],
  },
  {
    name: 'Solar Panel',
    yield: 1,
    time: 10,
    source: 'assembler',
    requirements: [
      { name: 'Copper', amount: 5 },
      { name: 'Green Circuit', amount: 15 },
      { name: 'Steel', amount: 5 },
    ]
  },
  {
    name: 'Rocket Part',
    time: 3,
    yield: 1,
    source: 'rocket silo',
    requirements: [
      { name: 'Low Density Structure', amount: 10 },
      { name: 'Rocket Control Unit', amount: 10 },
      { name: 'Rocket Fuel', amount: 10 },
    ],
  },
  {
    name: 'Rocket Fuel',
    time: 30,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Solid Fuel', amount: 10 },
      { name: 'Light Oil', amount: 10 },
    ],
  },
  {
    name: 'Rocket Control Unit',
    time: 30,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Blue Circuit', amount: 1 },
      { name: 'Speed Module', amount: 1 },
    ],
  },
  {
    name: 'Speed Module',
    time: 15,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Red Circuit', amount: 5 },
      { name: 'Green Circuit', amount: 5 },
    ],
  },
  {
    name: 'Research Orange Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Orange Science', amount: 1 },
    ],
  },
  {
    name: 'Orange Science',
    time: 21,
    yield: 3,
    source: 'assembler',
    requirements: [
      { name: 'Flying Robot Frame', amount: 1 },
      { name: 'Low Density Structure', amount: 3 },
      { name: 'Blue Circuit', amount: 2 },
    ],
  },
  {
    name: 'Flying Robot Frame',
    time: 20,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Battery', amount: 2 },
      { name: 'Electric Engine', amount: 1 },
      { name: 'Green Circuit', amount: 3 },
      { name: 'Steel', amount: 1 },
    ]
  },
  {
    name: 'Electric Engine',
    time: 10,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Green Circuit', amount: 2 },
      { name: 'Engine', amount: 1 },
      { name: 'Lubricant', amount: 15 },
    ],
  },
  {
    name: 'Low Density Structure',
    time: 20,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Copper', amount: 20 },
      { name: 'Plastic', amount: 5 },
      { name: 'Steel', amount: 2 },
    ],
  },
  {
    name: 'Blue Circuit',
    time: 10,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Red Circuit', amount: 2 },
      { name: 'Green Circuit', amount: 20 },
      { name: 'Sulfuric Acid', amount: 5 },
    ],
  },
  {
    name: 'Assembling Machine 2',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Steel', amount: 2 },
      { name: 'Cog', amount: 5 },
      { name: 'Green Circuit', amount: 3 },
      { name: 'Assembling Machine', amount: 1 },
    ],
  },
  {
    name: 'Assembling Machine',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 9 },
      { name: 'Cog', amount: 5 },
      { name: 'Green Circuit', amount: 3 },
    ],
  },
  {
    name: 'Research Purple Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Purple Science', amount: 1 },
    ],
  },
  {
    name: 'Purple Science',
    time: 21,
    yield: 3,
    source: 'assembler',
    requirements: [
      { name: 'Rail', amount: 30 },
      { name: 'Electric Furnace', amount: 1 },
      { name: 'Productivity Module', amount: 1 },
    ],
  },
  {
    name: 'Rail',
    time: 0.5,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Stone', amount: 1 },
      { name: 'Steel', amount: 1 },
      { name: 'Iron Stick', amount: 1 },
    ],
  },
  {
    name: 'Iron Stick',
    time: 0.5,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 1 },
    ],
  },
  {
    name: 'Electric Furnace',
    time: 5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Steel', amount: 10 },
      { name: 'Red Circuit', amount: 5 },
      { name: 'Stone brick', amount: 10 },
    ],
  },
  {
    name: 'Productivity Module',
    time: 15,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Red Circuit', amount: 5 },
      { name: 'Green Circuit', amount: 5 },
    ],
  },
  {
    name: 'Research Blue Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Blue Science', amount: 1 },
    ],
  },
  {
    name: 'Blue Science',
    time: 24,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Engine', amount: 2 },
      { name: 'Red Circuit', amount: 3 },
      { name: 'Sulfur', amount: 1 },
    ],
  },
  {
    name: 'Research Green Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Green Science', amount: 1 },
    ],
  },
  {
    name: 'Green Science',
    time: 6,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Transport Belt', amount: 1 },
      { name: 'Inserter', amount: 1 },
    ],
  },
  {
    name: 'Research Red Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Red Science', amount: 1 },
    ],
  },
  {
    name: 'Red Science',
    time: 5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 1 },
    ],
  },
  {
    name: 'Engine',
    time: 10,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 1 },
      { name: 'Pipe', amount: 2 },
      { name: 'Steel', amount: 1 },
    ],
  },
  {
    name: 'Transport Belt 3',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 10 },
      { name: 'Transport Belt 2', amount: 1 },
      { name: 'Lubricant', amount: 20 },
    ],
  },
  {
    name: 'Tunnel 3',
    time: 2,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 80 },
      { name: 'Tunnel 2', amount: 2 },
      { name: 'Lubricant', amount: 40 },
    ],
  },
  {
    name: 'Splitter 3',
    time: 2,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 10 },
      { name: 'Red Circuit', amount: 10 },
      { name: 'Splitter 2', amount: 1 },
      { name: 'Lubricant', amount: 80 },
    ],
  },
  {
    name: 'Transport Belt 2',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 5 },
      { name: 'Transport Belt', amount: 1 },
    ],
  },
  {
    name: 'Tunnel 2',
    time: 2,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 40 },
      { name: 'Tunnel', amount: 2 },
    ],
  },
  {
    name: 'Splitter 2',
    time: 2,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 10 },
      { name: 'Green Circuit', amount: 10 },
      { name: 'Splitter', amount: 1 },
    ],
  },
  {
    name: 'Transport Belt',
    time: 0.5,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 1 },
      { name: 'Iron', amount: 1 },
    ],
  },
  {
    name: 'Tunnel',
    time: 1,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 10 },
      { name: 'Transport Belt', amount: 5 },
    ],
  },
  {
    name: 'Splitter',
    time: 1,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 5 },
      { name: 'Green Circuit', amount: 5 },
      { name: 'Transport Belt', amount: 4 },
    ],
  },
  {
    name: 'Inserter',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Green Circuit', amount: 1 },
      { name: 'Cog', amount: 1 },
      { name: 'Iron', amount: 1 },
    ],
  },
  {
    name: 'Cog',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 2 },
    ],
  },
  {
    name: 'Pipe',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 1 },
    ],
  },
  {
    name: 'Red Circuit',
    time: 6,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Green Circuit', amount: 2 },
      { name: 'Copper Wire', amount: 4 },
      { name: 'Plastic', amount: 2 },
    ],
  },
  {
    name: 'Green Circuit',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Copper Wire', amount: 3 },
      { name: 'Iron', amount: 1 },
    ],
  },
  {
    name: 'Copper Wire',
    time: 0.5,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Copper', amount: 1 },
    ],
  },
  {
    name: 'Red Magazine',
    time: 3,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Magazine', amount: 1 },
      { name: 'Steel', amount: 1 },
      { name: 'Copper', amount: 5 },
    ],
  },
  {
    name: 'Magazine',
    time: 1,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Iron', amount: 4 },
    ]
  },
  {
    name: 'Turret',
    time: 8,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Cog', amount: 10 },
      { name: 'Iron', amount: 20 },
      { name: 'Copper', amount: 10 },
    ],
  },
  {
    name: 'Research Black Science',
    time: 30,
    yield: 1,
    source: 'lab',
    requirements: [
      { name: 'Black Science', amount: 1 },
    ],
  },
  {
    name: 'Black Science',
    time: 10,
    yield: 2,
    source: 'assembler',
    requirements: [
      { name: 'Red Magazine', amount: 1 },
      { name: 'Grenade', amount: 1 },
      { name: 'Wall', amount: 2 },
    ],
  },
  {
    name: 'Grenade',
    time: 8,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Coal', amount: 10 },
    ],
  },
  {
    name: 'Wall',
    time: 0.5,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Stone brick', amount: 5 },
    ],
  },
  {
    name: 'Concrete',
    time: 10,
    yield: 10,
    source: 'assembler',
    requirements: [
      { name: 'Iron Ore', amount: 1 },
      { name: 'Stone Brick', amount: 5 },
      { name: 'Water', amount: 100 },
    ],
  },
  {
    name: 'Refined Concrete',
    time: 15,
    yield: 10,
    source: 'assembler',
    requirements: [
      { name: 'Concrete', amount: 20 },
      { name: 'Steel', amount: 1 },
      { name: 'Iron Stick', amount: 6 },
      { name: 'Water', amount: 100 },
    ]
  },
  {
    name: 'Accumulator',
    yield: 1,
    time: 10,
    source: 'assembler',
    requirements: [
      { name: 'Battery', amount: 5 },
      { name: 'Iron', amount: 2 },
    ],
  },
  {
    name: 'Battery',
    time: 4,
    yield: 1,
    source: 'chem',
    requirements: [
      { name: 'Copper', amount: 1 },
      { name: 'Iron', amount: 1 },
      { name: 'Sulfuric Acid', amount: 20 },
    ],
  },
  {
    name: 'Plastic',
    time: 1,
    yield: 2,
    source: 'chem',
    requirements: [
      { name: 'Coal', amount: 1 },
      { name: 'Petroleum', amount: 20 },
    ],
  },
  {
    name: 'Petroleum',
    time: 1,
    yield: 1,
    source: 'none',
    requirements: [],
  },
  {
    name: 'Sulfuric Acid',
    time: 1,
    yield: 50,
    source: 'chem',
    requirements: [
      { name: 'Iron', amount: 1 },
      { name: 'Sulfur', amount: 5 },
      { name: 'Water', amount: 100 },
    ],
  },
  {
    name: 'Sulfur',
    time: 1,
    yield: 2,
    source: 'chem',
    requirements: [
      { name: 'Petroleum', amount: 30 },
      { name: 'Water', amount: 30 },
    ],
  },
  {
    name: 'Lubricant',
    time: 1,
    yield: 10,
    source: 'chem',
    requirements: [
      { name: 'Heavy Oil', amount: 10 },
    ],
  },
  {
    name: 'Heavy Oil',
    time: 1,
    yield: 1,
    source: 'none',
    requirements: [],
  },
  {
    name: 'Light Oil',
    time: 1,
    yield: 1,
    source: 'none',
    requirements: [],
  },
  {
    name: 'Solid Fuel',
    time: 1,
    yield: 1,
    source: 'none',
    requirements: [],
  },
  {
    name: 'Water',
    time: 1,
    yield: 1,
    source: 'pump',
    requirements: [],
  },
  {
    name: 'Steel',
    time: 16,
    yield: 1,
    source: 'furnace',
    requirements: [
      { name: 'Iron', amount: 5 },
    ],
  },
  {
    name: 'Iron',
    time: 3.2,
    yield: 1,
    source: 'furnace',
    requirements: [
      { name: 'Iron Ore', amount: 1 },
    ],
  },
  {
    name: 'Iron Ore',
    time: 1,
    yield: 1,
    source: 'mine',
    requirements: [],
  },
  {
    name: 'Stone brick',
    time: 3.2,
    yield: 1,
    source: 'furnace',
    requirements: [
      { name: 'Stone', amount: 2 }
    ]
  },
  {
    name: 'Stone',
    time: 1,
    yield: 1,
    source: 'mine',
    requirements: [],
  },
  {
    name: 'Coal',
    time: 1,
    yield: 1,
    source: 'mine',
    requirements: [],
  },
  {
    name: 'Copper',
    time: 3.2,
    yield: 1,
    source: 'furnace',
    requirements: [
      { name: 'Copper Ore', amount: 1 },
    ],
  },
  {
    name: 'Copper Ore',
    time: 1,
    yield: 1,
    source: 'mine',
    requirements: [],
  },
  {
    name: 'Explosive',
    time: 4,
    yield: 2,
    source: 'chem',
    requirements: [
      { name: 'Coal', amount: 1 },
      { name: 'Sulfur', amount: 1 },
    ],
  },
  {
    name: 'Explosive Cannon Shell',
    time: 8,
    yield: 1,
    source: 'assembler',
    requirements: [
      { name: 'Steel', amount: 2 },
      { name: 'Plastic', amount: 2 },
      { name: 'Explosive', amount: 2 },
    ],
  },
  {
    name: 'Artillery Shell',
    time: 15,
    yield: 15,
    source: 'assembler',
    requirements: [
      { name: 'Explosive', amount: 8 },
      { name: 'Explosive Cannon Shell', amount: 4 },
      { name: 'Radar', amount: 1 },
    ],
  },
];

export const recipeDatabase: RecipeDatabase = keyBy(recipes, 'name');
