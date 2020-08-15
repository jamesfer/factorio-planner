import { Recipe, recipeDatabase } from './recipeDatabase';

export function findRecipe(name: string): Recipe {
  if (recipeDatabase[name]) {
    return recipeDatabase[name];
  }

  throw new Error(`Could not find recipe in database: ${name}`);
}

