// mobile/utils/diagnosticEngine.js
/**
 * Calcule la probabilité des pathologies pour une culture donnée.
 * @param {string[]} selectedIds - Tableau des IDs des symptômes cochés (ex: ["duvet_blanc", "tache_chocolat"])
 * @param {string} cropId - L'ID de la culture sélectionnée (ex: "cacao_01")
 * @param {Object} database - L'objet cropDiagnosticsDatabase
 * @returns {Array} Liste triée des diagnostics probables
 */
export const getProbability = (selectedIds, cropId, database) => {
  // 1. Trouver la culture dans n'importe quelle zone
  let targetCrop = null;
  for (const zone of database.zones) {
    targetCrop = zone.cultures.find(c => c.id === cropId);
    if (targetCrop) break;
  }

  if (!targetCrop) return [];

  // 2. Analyser chaque pathologie de cette culture
  const results = targetCrop.pathologies.map(patho => {
    let currentScore = 0;
    let maxPossibleScore = 0;

    patho.symptomes.forEach(s => {
      maxPossibleScore += s.poids;
      if (selectedIds.includes(s.id)) {
        currentScore += s.poids;
      }
    });

    const probability = maxPossibleScore > 0 
      ? (currentScore / maxPossibleScore) * 100 
      : 0;

    return {
      nom: patho.nom,
      type: patho.type,
      probabilite: Math.round(probability),
      conseil: patho.conseil,
      lien_achat: `https://cafcoop.cm/product/${patho.produit_cafcoop.slug}`,
      produit_nom: patho.produit_cafcoop.nom
    };
  });

  // 3. Filtrer les résultats à 0% et trier par la plus haute probabilité
  return results
    .filter(res => res.probabilite > 0)
    .sort((a, b) => b.probabilite - a.probabilite);
};