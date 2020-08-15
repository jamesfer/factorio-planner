import { partition, range, sum, map } from 'lodash';
import { DependencyTree } from '../index';
import { findRecipe } from '../recipes/findRecipe';
import { Recipe } from '../recipes/recipeDatabase';
import { createDependencyTree } from './createDependencyTree';

function findAllDependencies(parents: string[], tree: DependencyTree): string[] {
  const newDependencies = tree.filter(dependency => (
    !parents.includes(dependency.name)
    && dependency.dependents.some(dependent => parents.includes(dependent))
  ));
  if (newDependencies.length > 0) {
    let newParents = [...parents, ...newDependencies.map(dep => dep.name)];
    return findAllDependencies(newParents, tree);
  }
  return parents;
}

function isDirectlyIndependent(name: string, tree: DependencyTree, allowedDependents: string[], displayedSources: Recipe['source'][]): boolean {
  const dependencies = tree.filter(dependency => (
    dependency.dependents.includes(name)
  ));
  return dependencies
    .filter(dependency => displayedSources.includes(findRecipe(dependency.name).source))
    .every(dependency => (
      dependency.dependents.every(dependent => allowedDependents.includes(dependent))
    ));
}

function isIndependent(name: string, tree: DependencyTree, displayedSources: Recipe['source'][]): boolean {
  const recipe = findRecipe(name);
  if (!displayedSources.includes(recipe.source)) {
    return false;
  }

  const allDependencies = findAllDependencies([name], tree);
  return allDependencies.every(dependency => {
    return isDirectlyIndependent(dependency, tree, allDependencies, displayedSources);
  });
}

export function findIndependentTrees(recipe: Recipe, displayedSources: Recipe['source'][]): string[] {
  const dependencyTree = createDependencyTree(recipe);
  return dependencyTree.filter(dependency => isIndependent(dependency.name, dependencyTree, displayedSources))
    .map(dependency => dependency.name);
}

function product(numbers: number[]): number {
  return numbers.reduce((a, b) => a * b, 1);
}

function factorial(number: number): number {
  return product(range(1, number + 1));
}

export function childDepPerms(name: string, independentTrees: string[], dependencyTree: DependencyTree): { multiplicative: number, additive: number } {
  const isIndependent = independentTrees.includes(name);
  const children = dependencyTree.filter(dep => dep.dependents.includes(name));
  const childResults = children.map(child => ({ name: child.name, results: childDepPerms(child.name, independentTrees, dependencyTree) }));
  const [independentChildren, nonIndependentChildren] = partition(childResults, child => independentTrees.includes(child.name));

  const permutationsForCurrentLevel = isIndependent ? factorial(nonIndependentChildren.length) : factorial(children.length);
  const nonIndependentChildPermutations = product(childResults.map(child => child.results.multiplicative));
  const additivePermutations = sum(childResults.map(child => child.results.additive));
  if (name === 'Orange Science') {
    console.log(isIndependent, permutationsForCurrentLevel, childResults, additivePermutations);
  }
  if (isIndependent) {
    return {
      multiplicative: 1,
      additive: permutationsForCurrentLevel + additivePermutations,
    };
  }
  return {
    multiplicative: permutationsForCurrentLevel,
    additive: additivePermutations,
  };

  // if (isIndependent) {
  //   const permutations = factorial(nonIndChildren.length) * permsOf(nonIndChildren) + sum(indChildren.map(permsOf));
  // } else {
  //
  // }
  //
  // const childResults = children.map(child => childDepPerms(child.name, independentTrees, dependencyTree));
  // const permutationsForThisTree = factorial(children.length)
  //
  // if (isIndependent) {
  //   return [1, ];
  // }
}

export function permDeps(recipe: Recipe, independents: string[]): number {
  const tree = createDependencyTree(recipe);
  const results = tree.map(treeItem => ({ name: treeItem.name, ...childDepPerms(treeItem.name, independents, tree) }));
  console.log(results);
  return product(map(results, 'multiplicative')) + sum(map(results, 'additive'));
}

export function depGraphPerms(recipe: Recipe) {
  let remainingDependencies = createDependencyTree(recipe);
  // console.log(remainingDependencies.filter(d => d.dependents.length === 1));


  let used: string[] = [recipe.name];
  let level = 1;
  const levelCounts = [1];
  while (remainingDependencies.length > 0) {
    const [available, remaining] = partition(remainingDependencies, dependency => dependency.dependents.every(dependent => used.includes(dependent)));
    if (available.length === 0) {
      throw new Error('Could not handle dependents');
    }

    levelCounts[level] = available.filter(d => d.dependents.length !== 1).length;
    used = used.concat(available.map(a => a.name));
    remainingDependencies = remaining;
    level += 1;
  }

  console.log(levelCounts);
}
