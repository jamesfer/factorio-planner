import { DependencyTree, ProductionLineSetup } from '../index';

export function findAvailableDependents(dependencyTree: DependencyTree, setup: ProductionLineSetup) {
  return dependencyTree.filter(dependency => (
    dependency.dependents.every(dependent => !!setup[dependent])
  ));
}
