import { flatMap, groupBy, map } from 'lodash';
import { Dependency, DependencyTree } from '../index';
import { findRecipe } from '../recipes/findRecipe';
import { Recipe } from '../recipes/recipeDatabase';

function mergeDependencyTree(left: DependencyTree, right: DependencyTree): DependencyTree {
  return map(groupBy([...left, ...right], 'name'), (dependencies): Dependency => {
    return {
      name: dependencies[0].name,
      dependents: flatMap(dependencies, 'dependents'),
    };
  });
}

export function createDependencyTree(recipe: Recipe): DependencyTree {
  const dependencies: DependencyTree = recipe.requirements.map(requirement => ({
    name: requirement.name,
    dependents: [recipe.name]
  }));
  const childDependencies = recipe.requirements.map(requirement => (
    createDependencyTree(findRecipe(requirement.name)
    )));
  return [dependencies, ...childDependencies].reduce(mergeDependencyTree);
}
