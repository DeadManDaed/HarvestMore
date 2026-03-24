// mobile/data/cropDiagnostics.js
export const cropDiagnosticsDatabase = {
  version: "3.0",
  last_update: "2026-03-24",
  provider: "CAFCOOP Digital Services",
  zones: [
    {
      id: "ZAE_1",
      nom: "Soudano-Sahélienne (Nord/Extrême-Nord)",
      cultures: [
        {
          id: "sorgho_01",
          nom: "Sorgho",
          pathologies: [
            {
              nom: "Charbon du Sorgho",
              type: "Fongique",
              conseil: "Détruire les épis infectés hors du champ. Utiliser des semences traitées.",
              produit_cafcoop: { nom: "Fongicide Semences", slug: "traitement-semences" },
              symptomes: [
                { id: "poudre_noire", desc: "Grains remplacés par une masse de poudre noire", poids: 1.0 },
                { id: "croissance_reduite", desc: "Taille de la plante anormalement petite", poids: 0.3 }
              ]
            }
          ]
        },
        {
          id: "coton_01",
          nom: "Coton",
          pathologies: [
            {
              nom: "Pucerons / Fumagine",
              type: "Ravageur",
              conseil: "Surveiller dès la levée. Pulvériser sur les faces inférieures des feuilles.",
              produit_cafcoop: { nom: "Insecticide Systémique", slug: "protection-coton" },
              symptomes: [
                { id: "feuille_brillante", desc: "Feuilles collantes (miellat)", poids: 0.8 },
                { id: "enroulement", desc: "Feuilles recroquevillées vers le bas", poids: 0.6 }
              ]
            }
          ]
        },
        {
          id: "oignon_01",
          nom: "Oignon",
          pathologies: [
            {
              nom: "Thrips",
              type: "Ravageur",
              conseil: "Rotation des cultures. Pulvériser avec un insecticide spécifique.",
              produit_cafcoop: { nom: "Insecticide Bio", slug: "protection-oignon" },
              symptomes: [
                { id: "taches_argentees", desc: "Taches blanc-argenté sur les feuilles", poids: 1.0 }
              ]
            }
          ]
        },
        {
          id: "mil_01",
          nom: "Mil",
          pathologies: [
            {
              nom: "Ergot du mil",
              type: "Fongique",
              conseil: "Utiliser des semences saines. Éliminer les épis infectés.",
              produit_cafcoop: { nom: "Fongicide Semences", slug: "traitement-semences" },
              symptomes: [
                { id: "miellat_noir", desc: "Épis recouverts d'un miellat sucré puis d'une masse noire", poids: 1.0 }
              ]
            }
          ]
        }
        // Ajoutez ici toutes les autres cultures de la ZAE_1 (Niébé, Sésame, Riz, Arachide, Pastèque, Ail, Gombo)
        // et toutes les autres zones (ZAE_2 à ZAE_5) avec leurs cultures et pathologies.
        // Pour éviter de surcharger ce message, je vous fournirai un fichier complet à part si nécessaire.
      ]
    },
    // Exemple pour ZAE_3 (Hauts Plateaux)
    {
      id: "ZAE_3",
      nom: "Hauts Plateaux (Ouest/Nord-Ouest)",
      cultures: [
        {
          id: "pdt_01",
          nom: "Pomme de terre",
          pathologies: [
            {
              nom: "Mildiou",
              type: "Fongique",
              conseil: "Traiter préventivement par temps humide. Éviter l'excès d'azote.",
              produit_cafcoop: { nom: "Fongicide à base de Cuivre", slug: "fongicide-contact" },
              symptomes: [
                { id: "duvet_blanc", desc: "Feutrage blanc sous les feuilles", poids: 1.0 },
                { id: "tache_huileuse", desc: "Taches brunes d'aspect huileux sur le dessus", poids: 0.7 }
              ]
            }
          ]
        },
        {
          id: "cafe_01",
          nom: "Café Arabica",
          pathologies: [
            {
              nom: "Rouille orangée",
              type: "Fongique",
              conseil: "Désherbage régulier et taille de formation pour aérer le caféier.",
              produit_cafcoop: { nom: "Fongicide Systémique", slug: "soins-cafe" },
              symptomes: [
                { id: "pustule_orange", desc: "Pustules poudreuses orange sous les feuilles", poids: 1.0 },
                { id: "chute_feuilles", desc: "Défoliation sévère de l'arbre", poids: 0.5 }
              ]
            }
          ]
        }
        // Ajoutez ici les autres cultures de la ZAE_3
      ]
    },
    // Exemple pour ZAE_5 (Forêt Bimodale)
    {
      id: "ZAE_5",
      nom: "Forêt Dense Bimodale (Centre/Sud/Est)",
      cultures: [
        {
          id: "cacao_01",
          nom: "Cacao",
          pathologies: [
            {
              nom: "Pourriture brune",
              type: "Fongique",
              conseil: "Récolte sanitaire tous les 15 jours. Nettoyer les rigoles de drainage.",
              produit_cafcoop: { nom: "Bio-Stimulant Immunitaire", slug: "bio-stimulants" },
              symptomes: [
                { id: "tache_chocolat", desc: "Tache marron progressant vite sur la cabosse", poids: 0.9 },
                { id: "odeur_fongique", desc: "Odeur caractéristique de moisi sur les fruits", poids: 0.4 }
              ]
            },
            {
              nom: "Mirides (Capsides)",
              type: "Ravageur",
              conseil: "Traiter tôt le matin. Pulvériser les troncs et les branches.",
              produit_cafcoop: { nom: "Insecticide Choc", slug: "anti-mirides" },
              symptomes: [
                { id: "piqure_noire", desc: "Petites taches noires circulaires sur cabosses", poids: 0.8 },
                { id: "dessèchement_pousses", desc: "Extrémités des branches qui grillent", poids: 0.7 }
              ]
            }
          ]
        },
        {
          id: "manioc_01",
          nom: "Manioc",
          pathologies: [
            {
              nom: "Mosaïque africaine",
              type: "Viral",
              conseil: "Utiliser des boutures saines certifiées. Arracher les plants atteints.",
              produit_cafcoop: { nom: "Fertilisant Racinaire", slug: "engrais-sol" },
              symptomes: [
                { id: "feuille_mosaique", desc: "Marbrures jaunes et vertes sur les feuilles", poids: 1.0 },
                { id: "feuille_deformee", desc: "Feuilles rétrécies et tordues", poids: 0.8 }
              ]
            }
          ]
        }
        // Ajoutez ici les autres cultures de la ZAE_5
      ]
    }
  ]
};