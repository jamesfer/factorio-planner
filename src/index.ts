import * as chalk from 'chalk';
import {
  filter,
  find,
  findIndex,
  flatMap,
  forEach,
  map,
  max,
  maxBy,
  mean,
  pickBy,
  range,
  sum,
  uniqBy,
} from 'lodash';
import * as yargs from 'yargs';
import {
  coerceAssemblerSpeed,
  coerceFurnaceSpeed,
  coerceLabSpeed,
  coerceMineSpeed,
  coerceQuantity,
} from './cli/coercions';
import { createDependencyTree } from './dependencies/createDependencyTree';
import { findAvailableDependents } from './dependencies/findAvailableDependents';
import { findIndependentTrees } from './dependencies/independentDependencies';
import { findRecipe } from './recipes/findRecipe';
import { Recipe } from './recipes/recipeDatabase';

export interface Dependency {
  name: string;
  dependents: string[];
}

export type DependencyTree = Dependency[];

interface ProductionSetup {
  count: number;
  efficiency: number;
  consumed: number;
  produced: number;
  recipe: Recipe;
}

export interface ProductionLineSetup {
  [k: string]: ProductionSetup;
}

interface ProductionSpeedMultipliers {
  assembler: number;
  mine: number;
  lab: number;
  pump: number;
  chem: number;
  furnace: number;
  'rocket silo': number;
}

const DEFAULT_PRODUCTION_SPEEDS: ProductionSpeedMultipliers = {
  assembler: 1,
  mine: 1,
  lab: 1,
  pump: 1,
  chem: 1,
  furnace: 1,
  'rocket silo': 1,
};

// const ASSEMBLER_SPEEDS = {
//   'tier 1': 1,
//   'tier 2': 2,
//   'tier 3': 3,
// };

function getSpeedMultiplier(source: Recipe['source'], productionSpeeds: ProductionSpeedMultipliers): number {
  if (source === 'none') {
    return 1;
  }

  return productionSpeeds[source];
}

function calculateProductionSetup(recipeName: string, productionLineSetup: ProductionLineSetup, productionSpeeds: ProductionSpeedMultipliers): ProductionSetup {
  const recipe = findRecipe(recipeName);

  // Find the number of resources consumed by existing producers
  const totalAmountConsumed = sum(map(productionLineSetup, (assembler): number => {
    const requirement = find(assembler.recipe.requirements, { name: recipeName });
    if (!requirement) {
      return 0;
    }
    const speedMultiplier = getSpeedMultiplier(assembler.recipe.source, productionSpeeds);
    return assembler.efficiency * requirement.amount * assembler.count / assembler.recipe.time * speedMultiplier;
  }));

  // Determine the amount of producers of this recipe required to meet the demand
  const speedMultiplier = getSpeedMultiplier(recipe.source, productionSpeeds);
  const requiredProduction = totalAmountConsumed / (recipe.yield / recipe.time * speedMultiplier);
  const requiredAssemblerCount = Math.ceil(requiredProduction);
  const actualProduction = requiredAssemblerCount * recipe.yield / recipe.time * speedMultiplier;

  return {
    recipe,
    count: requiredAssemblerCount,
    efficiency: Math.min(1, requiredProduction / requiredAssemblerCount),
    consumed: totalAmountConsumed,
    produced: actualProduction,
  }
}

function findSetupUsingDependencyTree(recipe: Recipe, rate: number, dependencyTree: DependencyTree, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup {
  const machines = Math.ceil(calculateRequiredMachines(rate, recipe, productionSpeeds));
  const produced = calculateRate(machines, recipe, productionSpeeds);
  const productionLineSetup: ProductionLineSetup = {
    [recipe.name]: {
      recipe,
      count: machines,
      efficiency: rate / produced,
      consumed: rate,
      produced: produced,
    },
  };
  let remainingDependencies = dependencyTree;
  while (remainingDependencies.length > 0) {
    const availableDependencies = findAvailableDependents(remainingDependencies, productionLineSetup);
    if (availableDependencies.length === 0) {
      throw new Error('No available dependencies could be found');
    }

    availableDependencies.forEach((availableDependency) => {
      const setup = calculateProductionSetup(availableDependency.name, productionLineSetup, productionSpeeds);
      productionLineSetup[availableDependency.name] = setup;
    });

    remainingDependencies = remainingDependencies.filter(remaining => (
      !find(availableDependencies, { name: remaining.name })
    ));
  }
  return productionLineSetup;
}

function findSetup(recipe: Recipe, rate: number, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup {
  return findSetupUsingDependencyTree(recipe, rate, createDependencyTree(recipe), productionSpeeds);
}

// function findSetups(recipe: Recipe, maxRootCount: number, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup[] {
//   const dependencyTree = createDependencyTree(recipe);
//   return range(1, maxRootCount + 1).map((i) => findSetupUsingDependencyTree(recipe, i, dependencyTree, productionSpeeds));
// }

function calculateTotalSetupEfficiency(setup: ProductionLineSetup): number {
  return mean(map(setup, 'efficiency'));
}

// function findBestSetup(recipe: Recipe, maxOutputCount: number, productionSpeeds: ProductionSpeedMultipliers) {
//   const setups = findSetups(recipe, maxOutputCount, productionSpeeds);
//   return maxBy(map(setups, setup => ({ setup, efficiency: calculateTotalSetupEfficiency(setup) })), 'efficiency');
// }

function toCsv(primaryName: string, setups: ProductionLineSetup[]): string {
  let output = 'Output count,Efficiency\n';
  setups.forEach((setup) => {
    output += setup[primaryName].count;
    output += ',';
    output += mean(map(setup, 'efficiency'));
    output += '\n';
  });
  return output;
}

function displayPossibleFraction(number: number): string {
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

function containsProductOf(setup: ProductionLineSetup, source: Recipe['source']): boolean {
  return filter(setup, assemblerSetup => assemblerSetup.recipe.source === source).length > 0;
}

function displaySetup(setup: ProductionLineSetup, source: Recipe['source'] = 'assembler'): string {
  const filteredSetup = pickBy(setup, assemblerSetup => assemblerSetup.recipe.source === source);
  const maxNameLength: number = maxBy(map(filteredSetup, 'recipe.name.length'));
  const maxCountLength: number = max(map(filteredSetup, assembler => assembler.count.toString().length));
  return map(filteredSetup, (assembler, name) => {
    return `${name.padStart(maxNameLength, ' ')}  ${assembler.count.toString().padEnd(maxCountLength, ' ')}  ${(assembler.efficiency * 100).toFixed(0)}% (${displayPossibleFraction(assembler.consumed)}/${displayPossibleFraction(assembler.produced)})`;
  }).join('\n');
}

function displayInTable(rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = rows[0].length;
  const maxLengths = range(columns).map(i => max(map(rows, `${i}.length`)));
  return rows.map(row => row.map((value, index) => value.padEnd(maxLengths[index], ' ')).join('  ')).join('\n');
}

function makeBeltIcon(capacity: number, items: number): string {
  // return {
  //   0: '[  |  ]',
  //   1: '[\u2588 |  ]',
  //   2: '[\u2588\u2588|  ]',
  //   3: '[\u2588\u2588|\u2588 ]',
  //   4: '[\u2588\u2588|\u2588\u2588]',
  // }[Math.min(4, Math.ceil(items / capacity / 4))];
  if (items > capacity) {
    const fullBeltCount = Math.ceil(items / capacity);
    return `${fullBeltCount} x \u2588`;
  }

  return {
    0: '',
    1: '\u2582',
    2: '\u2584',
    3: '\u2586',
    4: '\u2588',
  }[Math.min(4, Math.ceil(items * 4 / capacity))];
}

function makeTrainIcon(itemsPerSecond) {
  const itemsPerMinute = itemsPerSecond * 60;
  const trains = Math.ceil(itemsPerMinute / (40 * 100));
  return `${trains} x 🚅/m`;
}

function displayBeltCapacity(itemsPerSecond: number): string {
  if (itemsPerSecond <= 15) {
    return chalk.yellow(makeBeltIcon(15, itemsPerSecond));
  }
  if (itemsPerSecond <= 30) {
    return chalk.red(makeBeltIcon(30, itemsPerSecond));
  }

  const blueBelt = chalk.blue(makeBeltIcon(45, itemsPerSecond));
  if (itemsPerSecond < 70) {
    return blueBelt;
  }
  return `${blueBelt} ${makeTrainIcon(itemsPerSecond)}`;
}

function displayRawRequirements(setup: ProductionLineSetup, displaySources: Recipe['source'][], primaryRecipe: string, productionSpeeds: ProductionSpeedMultipliers): string {
  let rawMaterials: { [k: string]: number } = {};
  forEach(setup, (assemblerSetup) => {
    const recipe = assemblerSetup.recipe;
    if (displaySources.includes(recipe.source)) {
      forEach(recipe.requirements, (requirement) => {
        const requirementRecipe = findRecipe(requirement.name);
        if (!displaySources.includes(requirementRecipe.source)) {
          const speedMultiplier = getSpeedMultiplier(recipe.source, productionSpeeds);
          const amount = requirement.amount * assemblerSetup.count * assemblerSetup.efficiency / (recipe.time / speedMultiplier);
          rawMaterials[requirement.name] = (rawMaterials[requirement.name] || 0) + amount;
        }
      });

      // if (recipe.name in rawMaterials) {
      //   rawMaterials[recipe.name] += amount;
      // } else {
      //   rawMaterials[recipe.name] = amount;
      // }
    }
    // recipe.requirements.forEach((requirement) => {
    //   const amount = requirement.amount * assemblerSetup.count / recipe.time;
    //   if (requirement.name in rawMaterials) {
    //     rawMaterials[requirement.name] += amount;
    //   } else {
    //     rawMaterials[requirement.name] = amount;
    //   }
    // });
  });

  // const maxNameLength = maxBy(Object.keys(rawMaterials), 'length');
  // const maxCountLength = maxBy(Object.values(rawMaterials), value => value.toString().length + 2)

  const tableData = map(rawMaterials, (amount, name) => [name, `${Math.ceil(amount * 60)}/m`, displayBeltCapacity(amount)]);
  return displayInTable(tableData);
  // return map(rawMaterials, (amount, name) => `  ${name}: ${Math.ceil(amount * 60)}/m`).join('\n');
}

function calculateRate(productionMachines: number, recipe: Recipe, speeds: ProductionSpeedMultipliers) {
  return productionMachines * recipe.yield * getSpeedMultiplier(recipe.source, speeds) / recipe.time;
}

function calculateRequiredMachines(rate: number, recipe: Recipe, speeds: ProductionSpeedMultipliers) {
  return rate * recipe.time / recipe.yield / getSpeedMultiplier(recipe.source, speeds);
}

function displayDependencyData(recipe: Recipe, sources: Recipe['source'][]) {
  const dependencyGraph = createDependencyTree(recipe);
  const independent = findIndependentTrees(recipe, sources);
  const sourceDependencies = dependencyGraph.filter(dependency => (
    sources.includes(findRecipe(dependency.name).source)
      && (!independent.includes(dependency.name) || dependency.dependents.length > 1)
      && (dependency.dependents.length <= 4)
      // || dependency.dependents.some(dependent => sources.includes(findRecipe(dependent).source))
  ));

  const displayedDependencyNames = flatMap(
    dependencyGraph.filter(dependency => sources.includes(findRecipe(dependency.name).source)),
    dependency => [dependency.name, ...dependency.dependents],
  );
  // console.log(displayedDependencyNames);

  // const sourceDependencies = dependencyGraph.filter(dependency => displayedDependencyNames.includes(dependency.name));
  const nodes = [
    { id: -1, label: recipe.name },
    ...sourceDependencies.map((dependency, index) => ({ id: index, label: dependency.name }))
  ];
  const edges = flatMap(sourceDependencies, (dependency, index) => dependency.dependents
    .filter(dependent => dependent === recipe.name || findIndex(sourceDependencies, { name: dependent }))
    .map(dependent => ({
      to: index,
      from: findIndex(sourceDependencies, { name: dependent }),
    }))
  );
  const uniqueEdges = uniqBy(edges, JSON.stringify);

  return `const nodes = new vis.DataSet(${JSON.stringify(nodes)}), edges = new vis.DataSet(${JSON.stringify(uniqueEdges)});`;
}

function displayAssemblerIO(setup: ProductionSetup, speeds: ProductionSpeedMultipliers): string {
  const messages: string[] = [];
  const recipe = setup.recipe;

  const requirementsWithCount = map(recipe.requirements, requirement => ({
    ...requirement,
    materialCount: requirement.amount / recipe.time * getSpeedMultiplier(recipe.source, speeds),
  }));
  const highestRequiredMaterial = maxBy(requirementsWithCount, 'materialCount');
  const maxAssemblers = Math.floor(45 / highestRequiredMaterial.materialCount);

  messages.push(`Max assemblers per row ${maxAssemblers} (${(setup.count / maxAssemblers).toFixed(1)})`);

  requirementsWithCount.forEach((requirement) => {
    const fastInserterCount = Math.ceil(requirement.materialCount / 6.43);
    const stackInserterCount = Math.ceil(requirement.materialCount / 15);
    if (fastInserterCount === 1) {
      messages.push(`${requirement.name} ${displayBeltCapacity(requirement.materialCount * maxAssemblers)} ${fastInserterCount} x FI`);
    } else {
      messages.push(`${requirement.name} ${displayBeltCapacity(requirement.materialCount * maxAssemblers)} ${fastInserterCount} x FI ${stackInserterCount} x SI`);
    }
  });
  return messages.join('\n');
}

function displayIO(setup: ProductionLineSetup, displayedSources: Recipe['source'][], speeds: ProductionSpeedMultipliers): string {
  const messages: string[] = [];
  for (const name in setup) {
    if (setup[name].recipe.requirements.length > 0 && displayedSources.includes(setup[name].recipe.source)) {
      messages.push(`  ${name}`);
      messages.push(displayAssemblerIO(setup[name], speeds).split('\n').map(line => `    ${line}`).join('\n'));
    }
  }
  return messages.join('\n');
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    // case 'csv': {
    //   const recipeName = args[0];
    //   if (!recipeName) {
    //     throw new Error('No recipe provided');
    //   }
    //   const recipe = findRecipe(recipeName);
    //
    //   const count = args[1] === undefined ? 4 : +args[1];
    //   if (Number.isNaN(count)) {
    //     throw new Error(`Unknown count ${args[1]}`);
    //   }
    //
    //   const setups = findSetups(recipe, count, DEFAULT_PRODUCTION_SPEEDS);
    //   console.log(toCsv(recipeName, setups));
    //   break;
    // }
    //
    // case 'optimize': {
    //   const recipeName = args[0];
    //   if (!recipeName) {
    //     throw new Error('No recipe provided');
    //   }
    //   const recipe = findRecipe(recipeName);
    //
    //   const count = args[1] === undefined ? 4 : +args[1];
    //   if (Number.isNaN(count)) {
    //     throw new Error(`Unknown count ${args[1]}`);
    //   }
    //
    //   const { setup, efficiency } = findBestSetup(recipe, count, DEFAULT_PRODUCTION_SPEEDS);
    //   console.log(displaySetup(setup));
    //   console.log(`Overall efficiency:     ${(efficiency * 100).toFixed(0)}%`);
    //   console.log(`Assemblers required:    ${sumBy(Object.values(setup), 'count')}`);
    //   console.log();
    //   console.log('Raw requirements per minute:');
    //   console.log(displayRawRequirements(setup, ['none', 'chem', 'mine', 'furnace', 'pump'], recipe.name, DEFAULT_PRODUCTION_SPEEDS));
    //   break;
    // }
    //
    // case 'satisfy': {
    //   const recipeName = args[0];
    //   if (!recipeName) {
    //     throw new Error('No recipe provided');
    //   }
    //   const recipe = findRecipe(recipeName);
    //
    //   const requirement = args[1] === undefined ? 4 : +args[1];
    //   if (Number.isNaN(requirement)) {
    //     throw new Error(`Unknown count ${args[1]}`);
    //   }
    //
    //   const count = Math.ceil(requirement * recipe.time / recipe.yield);
    //   const setup = findSetup(recipe, count, DEFAULT_PRODUCTION_SPEEDS);
    //   console.log(displaySetup(setup));
    //   console.log(`Overall efficiency:     ${(calculateTotalSetupEfficiency(setup) * 100).toFixed(0)}%`);
    //   console.log(`Assemblers required:    ${sumBy(Object.values(setup), 'count')}`);
    //   console.log();
    //   console.log('Raw requirements per minute:');
    //   console.log(displayRawRequirements(setup, ['none', 'chem', 'mine', 'furnace', 'pump'], recipe.name, DEFAULT_PRODUCTION_SPEEDS));
    //   break;
    // }
    //
    // case 'science': {
    //   const minutes = +args[0];
    //   if (Number.isNaN(minutes)) {
    //     throw new Error(`Unknown time ${args[0]}`);
    //   }
    //
    //   let scienceBonus = +args[1];
    //   if (Number.isNaN(scienceBonus)) {
    //     scienceBonus = 0;
    //   }
    //
    //   const researchTime = 60;
    //   const adjustedResearchTime = researchTime / (1 + scienceBonus / 100);
    //   // const packs = ;
    //   const costFormula = n => 1000 * 2 ** n;
    //   const labsCount = Math.ceil(costFormula(0) * adjustedResearchTime / (minutes * 60));
    //   // const packsRate = labsCount / researchTime;
    //
    //   console.log('Times');
    //   for (let n = 0; n < 5; n++) {
    //     console.log(`  Level ${n + 1}:`, (costFormula(n) * adjustedResearchTime / labsCount / 60).toFixed(0), 'minutes');
    //   }
    //
    //   console.log('Labs required:', labsCount);
    //
    //   const researchRecipe: Recipe = {
    //     name: 'Research',
    //     time: adjustedResearchTime,
    //     yield: 1,
    //     source: 'lab',
    //     requirements: [
    //       { name: 'Red Science', amount: 1 },
    //       { name: 'Green Science', amount: 1 },
    //       { name: 'Blue Science', amount: 1 },
    //       { name: 'Black Science', amount: 1 },
    //       { name: 'Purple Science', amount: 1 },
    //       { name: 'Orange Science', amount: 1 },
    //     ],
    //   };
    //
    //   const setup = findSetup(researchRecipe, labsCount, DEFAULT_PRODUCTION_SPEEDS);
    //   console.log('Setup:');
    //   console.log(displaySetup(setup));
    //   console.log();
    //   console.log('Raw requirements per minute:');
    //   console.log(displayRawRequirements(setup, ['none', 'chem', 'mine', 'furnace', 'pump'], researchRecipe.name, DEFAULT_PRODUCTION_SPEEDS));
    //   break;
    // }

    case 'd': {
      const command = yargs.command(
        'd <recipe>',
        'd',
        y => y
          .positional('recipe', {
            type: 'string',
            demandOption: true,
          })
          .coerce('recipe', findRecipe)
          .option('quantity', {
            alias: ['q'],
            string: true,
            demandOption: true,
          })
          .coerce('quantity', coerceQuantity)
          .option('displayRaw', {
            boolean: true,
            default: true,
          })
          .option('displayEfficiency', {
            boolean: true,
            default: true,
          })
          .option('displayAssemblers', {
            boolean: true,
            default: true,
          })
          .option('displayRocketSilos', {
            boolean: true,
            default: true,
          })
          .option('displayFurnaces', {
            boolean: true,
            default: false,
          })
          .option('displayChemicals', {
            boolean: true,
            default: false,
          })
          .option('displayMines', {
            boolean: true,
            default: false,
          })
          .option('displayLabs', {
            boolean: true,
            default: false,
          })
          .option('labSpeed', {
            string: true,
            default: 1,
            coerce: coerceLabSpeed,
          })
          .option('mineSpeed', {
            string: true,
            default: 1,
            coerce: coerceMineSpeed,
          })
          .option('assemblerSpeed', {
            string: true,
            default: 1,
            coerce: coerceAssemblerSpeed,
          })
          .option('furnaceSpeed', {
            string: true,
            default: 1,
            coerce: coerceFurnaceSpeed,
          })
          .option('displayDependencyData', {
            boolean: true,
            default: false,
          })
          .option('displayIO', {
            boolean: true,
            default: false,
          }),
      );
      const args = command.argv;

      const speeds: ProductionSpeedMultipliers = {
        pump: 1,
        chem: 1,
        assembler: args.assemblerSpeed,
        lab: args.labSpeed,
        mine: args.mineSpeed,
        furnace: args.furnaceSpeed,
        'rocket silo': 1,
      };

      const speedMultiplier = getSpeedMultiplier(args.recipe.source, speeds);
      const maxCount = 'assemblers' in args.quantity
        ? args.quantity.assemblers
        : Math.ceil(args.quantity.perSecond * args.recipe.time / speedMultiplier / args.recipe.yield);
      const rate = 'assemblers' in args.quantity
        ? calculateRate(args.quantity.assemblers, args.recipe, speeds)
        : args.quantity.perSecond;
      const setup = findSetup(args.recipe, rate, speeds);

      if (args.displayLabs && containsProductOf(setup, 'lab')) {
        console.log();
        console.log('Lab Setup');
        console.log(displaySetup(setup, 'lab'));
      }

      if (args.displayRocketSilos && containsProductOf(setup, 'rocket silo')) {
        console.log();
        console.log('Rocket Silo Setup');
        console.log(displaySetup(setup, 'rocket silo'));
      }

      if (args.displayAssemblers && containsProductOf(setup, 'assembler')) {
        console.log();
        console.log('Assembler Setup');
        console.log(displaySetup(setup, 'assembler'));
      }

      if (args.displayChemicals && containsProductOf(setup, 'chem')) {
        console.log();
        console.log('Chemical Plant Setup');
        console.log(displaySetup(setup, 'chem'));
      }

      if (args.displayFurnaces && containsProductOf(setup, 'furnace')) {
        console.log();
        console.log('Furnace Setup');
        console.log(displaySetup(setup, 'furnace'));
      }

      if (args.displayMines && containsProductOf(setup, 'mine')) {
        console.log();
        console.log('Mine Setup');
        console.log(displaySetup(setup, 'mine'));
      }

      // if (args.displayEfficiency) {
      //   console.log();
      //   console.log(`Overall efficiency ${(efficiency * 100).toFixed(0)}%`);
      // }

      const displayMap: { [k in Recipe['source']]: boolean } = {
        assembler: args.displayAssemblers,
        'rocket silo': args.displayRocketSilos,
        furnace: args.displayFurnaces,
        lab: args.displayLabs,
        mine: args.displayMines,
        chem: args.displayChemicals,
        pump: false,
        none: false,
      };
      const displayedSources: Recipe['source'][] = Object.keys(displayMap).filter(key => displayMap[key]) as any[];

      if (args.displayRaw) {
        console.log();
        console.log('Raw materials');
        console.log(displayRawRequirements(setup, displayedSources, args.recipe.name, speeds));
      }

      if (args.displayDependencyData) {
        console.log();
        console.log('Dependency Data');
        console.log(displayDependencyData(args.recipe, displayedSources));
      }

      if (args.displayIO) {
        console.log();
        console.log('Inputs and Outputs');
        console.log(displayIO(setup, displayedSources, speeds));
      }

      // depGraphPerms(args.recipe);
      // const independentTrees = findIndependentTrees(args.recipe, displayedSources);
      // console.log(independentTrees);
      // console.log(permDeps(args.recipe, independentTrees));

      break;
    }

    default:
      throw new Error(`Unknown command ${command}`);
  }
}

main();
