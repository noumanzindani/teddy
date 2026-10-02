// Allergy ↔ ingredient conflict detection.
//
// Given a client's known allergies/sensitivities and the ingredient lists of the
// products in a service's planned protocol, flag any product that contains an
// ingredient the client reacts to. Matching is case-insensitive and synonym-aware
// (e.g. an allergy to "Fragrance" flags products containing "Parfum"), which is the
// realistic-but-curated approach agreed for the demo — not a full INCI database.

export interface Allergy {
  name: string;
  severity?: string;
  note?: string;
}

export interface ProductLike {
  id: string;
  name: string;
  brand?: string | null;
  ingredients: string[];
}

export interface IngredientConflict {
  allergy: Allergy;
  ingredient: string; // the exact ingredient on the product that matched
}

export interface ProductFlag {
  product: ProductLike;
  conflicts: IngredientConflict[];
}

// Common cosmetic-ingredient synonym groups. An allergy term matching any member
// of a group also matches the others.
const SYNONYM_GROUPS: string[][] = [
  ['fragrance', 'parfum', 'perfume', 'aroma'],
  ['vitamin e', 'tocopherol', 'tocopheryl acetate', 'tocopheryl'],
  ['vitamin c', 'ascorbic acid', 'sodium ascorbyl phosphate', 'ascorbyl'],
  ['aha', 'glycolic acid', 'lactic acid', 'mandelic acid'],
  ['bha', 'salicylic acid'],
  ['retinoid', 'retinol', 'retinyl palmitate', 'retinaldehyde'],
  ['essential oil', 'limonene', 'linalool', 'citral', 'eugenol', 'geraniol'],
  ['paraben', 'methylparaben', 'propylparaben', 'butylparaben'],
  ['sulfate', 'sodium lauryl sulfate', 'sodium laureth sulfate', 'sls', 'sles'],
  ['beeswax', 'cera alba'],
  ['soy', 'glycine soja', 'soybean'],
  ['nut', 'almond', 'prunus amygdalus', 'argania', 'macadamia'],
];

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Return every search term implied by an allergy name (itself + synonym-group members).
function expandAllergyTerms(allergyName: string): string[] {
  const base = normalize(allergyName);
  const terms = new Set<string>([base]);
  for (const group of SYNONYM_GROUPS) {
    if (group.some((g) => base.includes(g) || g.includes(base))) {
      group.forEach((g) => terms.add(g));
    }
  }
  return [...terms];
}

// Does an ingredient match an allergy term? Match when either string contains the
// other (handles "Parfum" vs "Parfum (Fragrance)", "Glycolic Acid" vs "glycolic acid 30%").
function ingredientMatches(ingredient: string, term: string): boolean {
  const ing = normalize(ingredient);
  return ing === term || ing.includes(term) || term.includes(ing);
}

/**
 * Check a client's allergies against a list of protocol products.
 * Returns one ProductFlag per product that has at least one conflict.
 */
export function checkAllergiesAgainstProducts(
  allergies: Allergy[],
  products: ProductLike[],
): ProductFlag[] {
  if (!allergies?.length) return [];

  const flags: ProductFlag[] = [];
  for (const product of products) {
    const conflicts: IngredientConflict[] = [];
    for (const allergy of allergies) {
      const terms = expandAllergyTerms(allergy.name);
      for (const ingredient of product.ingredients ?? []) {
        if (terms.some((t) => ingredientMatches(ingredient, t))) {
          conflicts.push({ allergy, ingredient });
          break; // one hit per allergy per product is enough to flag
        }
      }
    }
    if (conflicts.length) flags.push({ product, conflicts });
  }
  return flags;
}

/**
 * Suggest safer replacement products: same vendor, professional type, no conflict
 * with the client's allergies, excluding products already in the protocol.
 */
export function suggestAlternatives(
  allergies: Allergy[],
  candidates: ProductLike[],
  excludeIds: Set<string>,
): ProductLike[] {
  return candidates.filter(
    (c) => !excludeIds.has(c.id) && checkAllergiesAgainstProducts(allergies, [c]).length === 0,
  );
}
