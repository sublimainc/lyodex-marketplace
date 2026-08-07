/**
 * Seeds the five long-form articles.
 *
 * These replace six fabricated posts removed earlier — invented Health Canada
 * regulatory news, a made-up "operators win 38% more contracts" figure. Every
 * number below is either read from this platform's own price survey or
 * attributed to a named external source with a link, and each article says
 * where a figure is uncertain rather than rounding the doubt away.
 *
 * That restraint is the point. A number no reader can check is worth nothing to
 * a search engine that weights sources, and worth less than nothing to a reader
 * who later discovers it was invented.
 *
 * Re-running updates existing rows by slug rather than appending.
 *
 *   DATABASE_URL='postgresql://…' node scripts/admin/seed-blog-articles.mjs
 */

import pg from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("\n  DATABASE_URL is required.\n");
  process.exit(1);
}

const AUTHOR = "LyoDex";
const OBSERVED = "5 août 2026";

const ARTICLES = [
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "prix-produits-lyophilises-amerique-du-nord",
    title: "Combien se vendent les produits lyophilisés en Amérique du Nord",
    category: "Données de marché",
    tags: ["prix", "Amérique du Nord", "données", "détail"],
    seo_description:
      "Relevé de 926 prix chez 67 marchands : médiane de 145 $ CA/kg toutes catégories, 178 $ pour les fruits, 167 $ pour les confiseries. Méthode, limites et mode d'emploi.",
    body: `Le prix médian d'un produit lyophilisé vendu au détail en Amérique du Nord est de **145 $ CA le kilogramme**. La moitié du marché se situe entre 95 $ et 223 $. Ces chiffres viennent d'un relevé de 926 observations chez 67 marchands, réalisé le ${OBSERVED}.

Cet article explique d'où viennent ces chiffres, comment s'en servir, et surtout ce qu'ils ne disent pas — parce que la confusion la plus coûteuse dans ce secteur consiste à prendre un prix de détail pour un tarif de service.

## Ce que le relevé mesure exactement

Nous avons lu les catalogues publics de marchands qui vendent des produits lyophilisés finis : fruits en sachet, bonbons, repas de plein air, poudres, viandes. Pour chaque produit, nous avons enregistré le prix affiché, le poids net publié par le marchand, la devise, l'URL de la fiche et la date de consultation.

Le prix au kilogramme est ensuite calculé, puis converti en dollars canadiens.

Ce que ces prix incluent : le produit, son emballage, la marge du détaillant, et le coût d'acquisition de la matière première fraîche.

Ce qu'ils n'incluent pas : la livraison, les taxes, et toute négociation de volume qui se ferait hors catalogue.

## Les chiffres par catégorie

En dollars canadiens par kilogramme, pour les catégories soutenues par au moins trois marchands distincts :

- **Fruits** — médiane 178 $, moitié centrale entre 126 $ et 269 $. 242 observations chez 23 marchands.
- **Viandes** — médiane 176 $, moitié centrale entre 148 $ et 202 $. 55 observations chez 7 marchands.
- **Confiseries** — médiane 167 $, moitié centrale entre 113 $ et 243 $. 249 observations chez 15 marchands.
- **Légumes** — médiane 161 $, moitié centrale entre 91 $ et 347 $. 45 observations chez 14 marchands.
- **Produits laitiers** — médiane 140 $, moitié centrale entre 99 $ et 171 $. 34 observations chez 7 marchands.
- **Repas complets** — médiane 126 $, moitié centrale entre 104 $ et 158 $. 58 observations chez 8 marchands.
- **Poudres** — médiane 125 $, moitié centrale entre 66 $ et 153 $. 18 observations chez 5 marchands.

Les catégories reposant sur moins de trois marchands ont été écartées. Avec un ou deux vendeurs, une « médiane de marché » n'est que la liste de prix d'une entreprise déguisée en statistique.

## Pourquoi la médiane et non la moyenne

Nous publions les deux, mais la médiane commande. L'écart entre elles est en soi une information.

En légumes, la moyenne dépasse la médiane de 74 %. En œufs, de 88 %. Une poignée de produits très chers — souvent des formats de dégustation de quelques grammes — tire la moyenne vers le haut sans que le marché s'y trouve. Un producteur qui fixerait son prix sur la moyenne des légumes lyophilisés se placerait très au-dessus de ce que ses concurrents demandent réellement.

En confiseries, l'écart n'est que de 5 %. La distribution y est nettement plus resserrée : le marché du bonbon lyophilisé est jeune, mais ses prix ont déjà convergé.

En pratique, l'intervalle du premier au troisième quartile est plus utile que n'importe quelle valeur centrale. Il décrit où se situe la moitié centrale du marché, et c'est dans cet intervalle qu'un produit ordinaire doit se placer pour ne pas paraître aberrant.

## Comment se servir de ces chiffres pour fixer un prix

Trois étapes, dans cet ordre.

**Comparez à format égal.** C'est la précaution la plus importante et la plus souvent négligée. Le prix au kilogramme dépend davantage de la taille de l'emballage que de la catégorie du produit. Un sachet de moins de 50 g se vend à une médiane de 257 $/kg; un format de 150 à 500 g, à 111 $/kg. Se comparer à « la médiane des fruits » quand on vend en portions individuelles conduit à se croire très cher alors qu'on est dans la norme de son format.

**Situez-vous dans l'intervalle, pas sur la médiane.** Si votre produit porte une certification biologique, une provenance identifiée ou une matière première coûteuse, le troisième quartile est votre repère. S'il s'agit d'un produit courant vendu en volume, visez le premier.

**Vérifiez la cohérence avec votre coût.** Le prix de détail doit couvrir la matière fraîche, la perte de masse au séchage, le temps de machine, l'emballage, la distribution et la marge. Un fruit qui perd 90 % de sa masse demande dix kilos de matière fraîche par kilo de produit fini. Si votre matière fraîche coûte 5 $/kg, vous avez déjà 50 $/kg de coût matière avant d'avoir allumé la machine.

## Ce qui fait varier le coût de transformation

Le prix de détail est en bout de chaîne. En amont, quatre facteurs déterminent ce que coûte réellement la transformation, et ils expliquent pourquoi deux produits d'apparence semblable ne se valent pas.

**La teneur en eau.** C'est le facteur dominant. Sublimer l'eau demande de l'énergie et du temps de machine, et les deux sont proportionnels à la quantité d'eau. Une fraise, à environ 90 % d'eau, occupe la machine bien plus longtemps qu'une viande cuite déjà partiellement égouttée — pour un rendement en produit sec bien inférieur.

**L'épaisseur du chargement.** Le front de sublimation progresse de la surface vers le cœur. Doubler l'épaisseur d'une couche ne double pas le temps de cycle, il l'allonge davantage. Les opérateurs expérimentés arbitrent en permanence entre remplir la machine et raccourcir le cycle.

**La structure du produit.** Un produit qui s'effondre en séchant perd sa valeur visuelle, et donc son prix. Les produits sucrés sont particulièrement délicats : le sucre abaisse la température à laquelle la matière commence à ramollir, ce qui impose un cycle plus lent et plus froid.

**Les exigences de certification.** Une production destinée à un client qui exige une certification alimentaire reconnue impose des procédures, une documentation et des contrôles qui n'ont rien à voir avec le procédé lui-même, mais qui pèsent sur le prix.

## La limite qu'il faut comprendre avant tout usage

**Ce sont des prix de produits finis vendus au détail. Ce ne sont pas des tarifs de lyophilisation à façon.**

La distinction n'est pas académique, elle porte sur un facteur d'environ vingt. Au Québec, des tarifs de service de 6 $/kg pour les lots de 100 kg et plus, et de 8 $/kg sous 100 kg, ont été rapportés pour de l'alimentaire courant. Un opérateur qui facture la transformation de la matière d'un client vend du temps de machine, de l'énergie et une compétence de procédé. Un marchand qui vend un sachet de fraises lyophilisées vend en plus la matière première, l'emballage, la marque, la distribution et sa marge.

Confondre les deux mène à deux erreurs symétriques. Un producteur qui facturerait son service au prix de détail perdrait tous ses appels d'offres. Un acheteur qui espérerait payer sa transformation au tarif de service et revendre au prix de détail sous-estimerait tout ce qu'il y a entre les deux.

## Le poids : la difficulté que personne ne mentionne

Calculer un prix au kilogramme demande deux nombres : le prix et le poids. Le premier est toujours affiché. Le second, souvent pas.

Sur les 5 440 lignes de produits relevées, seules 926 portent un poids net publié par le marchand lui-même. C'est un peu moins d'un cinquième. Les autres conservent leur prix dans notre base, sans prix au kilogramme — parce qu'une estimation de poids aurait produit un chiffre inventé, indiscernable d'un chiffre réel une fois publié.

Les plateformes de commerce comme Shopify exposent bien un champ de poids par variante, mais il s'agit du **poids d'expédition**, que beaucoup de marchands ne remplissent jamais sérieusement. Un marchand québécois y inscrit 5 g aussi bien pour un chili lyophilisé que pour un sac anti-ours à 69 $. S'y fier aurait donné un prix de 3 294 $/kg pour ce chili, et un jeu de données qui aurait paru complet tout en étant faux.

Ce genre de piège est la raison pour laquelle chaque ligne de notre base porte la mention de la façon dont son poids a été établi. Un lecteur qui veut ne retenir que les poids annoncés par le marchand peut filtrer là-dessus.

## Méthode et vérifiabilité

Chaque ligne du relevé porte l'URL de la fiche produit d'où elle vient et la date de lecture. N'importe qui peut refaire le calcul.

Les prix en devises étrangères sont convertis en dollars canadiens au taux du ${OBSERVED}, taux consigné avec les données pour que toute valeur puisse être retracée et réexprimée plus tard sans recollecter quoi que ce soit.

Les chiffres publiés ci-dessus ne reposent que sur les lignes dont le marchand annonce lui-même le poids. Les lignes reposant sur un poids d'expédition sont conservées, marquées comme peu fiables, et exclues de toute médiane.

## Ce que ce relevé ne couvre pas

Vingt-six des soixante-quatorze marchands recensés n'exposent aucun catalogue lisible par machine — la plupart utilisent des plateformes qui ne publient pas leurs produits sous forme de données. Leurs prix ne figurent pas ici.

Les places de marché — Amazon, Walmart, Chewy, REI, MercadoLibre — sont volontairement exclues. Ce sont des revendeurs multi-marques : y relever Mountain House puis le relever aussi sur son propre site pondérerait deux fois le même producteur et fausserait chaque médiane.

Enfin, ce relevé est une photographie datée. Il ne dit rien de l'évolution des prix, faute d'un relevé antérieur auquel le comparer. Ce sera possible au prochain passage.

---

*Relevé du ${OBSERVED}. 5 440 lignes produit chez 67 marchands, 926 exploitées pour les chiffres ci-dessus. Les données complètes, avec l'URL source de chaque observation, sont consultables sur la page [intelligence de marché](/market-intelligence). Questions fréquentes sur la lyophilisation : [la FAQ](/faq).*`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "prix-lyophilise-canada-etats-unis-aucun-ecart",
    title: "Canada ou États-Unis : le prix au kilo est le même",
    category: "Données de marché",
    tags: ["Canada", "États-Unis", "prix", "exportation"],
    seo_description:
      "166 $ CA/kg au Canada contre 169 $ aux États-Unis : moins de 2 % d'écart sur 553 observations. Ce que cela change pour un producteur canadien.",
    body: `Un producteur canadien qui hésite à se comparer au marché américain part souvent d'une intuition : les Américains vendent moins cher, leur marché est plus grand, leur concurrence plus dure. Le relevé ne le confirme pas.

**Médiane canadienne : 166 $ CA le kilogramme. Médiane américaine : 169 $.** L'écart est de moins de 2 %, sur 553 observations réparties chez 28 marchands.

À cette taille d'échantillon, 2 % n'est pas un écart. C'est du bruit.

## Les chiffres

- **Canada** — 217 observations chez 11 marchands. Médiane 166 $, moyenne 211 $, moitié centrale entre 100 $ et 270 $.
- **États-Unis** — 336 observations chez 17 marchands. Médiane 169 $, moyenne 208 $, moitié centrale entre 113 $ et 249 $.

Les deux distributions se superposent presque parfaitement. Les moyennes sont plus proches encore que les médianes. La moitié centrale du marché canadien est légèrement plus large, mais elle recouvre la même zone.

## Pourquoi c'est contre-intuitif

Trois raisons font attendre un écart, et aucune ne se matérialise dans les prix affichés.

**Le change.** Un dollar américain vaut plus qu'un dollar canadien, donc un produit vendu 20 $ US devrait ressortir plus cher une fois converti. C'est bien le cas ligne à ligne — mais les marchands américains affichent des prix nominaux plus bas, ce qui compense presque exactement.

**La taille du marché.** Les États-Unis comptent environ neuf fois plus d'habitants. On s'attendrait à des économies d'échelle et à une concurrence plus vive. Elles existent probablement dans les coûts de production, mais elles ne se voient pas dans les prix de détail.

**La densité de l'offre.** Notre registre recense 17 marchands américains contre 11 canadiens dans l'échantillon exploitable. Plus d'offre devrait signifier plus de pression sur les prix. Ce n'est pas ce qu'on observe.

## L'explication la plus probable

Le marché du produit lyophilisé fini n'est pas un marché de commodité. Un sachet de fraises lyophilisées ne se substitue pas mécaniquement à un autre : la marque, la provenance, le format, la certification biologique et le canal de vente pèsent autant que le contenu.

Dans un marché de ce type, le prix se fixe moins par la concurrence directe que par ce que le consommateur accepte de payer pour une collation transformée. Ce seuil d'acceptabilité est très semblable des deux côtés de la frontière — mêmes habitudes alimentaires, mêmes circuits de distribution, souvent les mêmes marques présentes dans les deux pays.

Autrement dit : le prix est tiré par la demande, pas poussé par les coûts. Et la demande se comporte pareil à Montréal et à Denver.

Cette lecture est cohérente avec un second constat de notre relevé : à l'intérieur d'un même pays, l'écart entre les catégories de produits est faible — de 126 $/kg pour les repas complets à 178 $/kg pour les fruits — alors que l'écart entre formats d'emballage est énorme. Ce qui structure les prix, c'est la façon dont le produit est présenté au consommateur, pas la géographie ni même la nature de l'aliment.

## Ce qui diffère vraiment entre les deux pays

L'absence d'écart sur les prix de détail ne signifie pas que les deux marchés sont identiques. Elle signifie que les différences se situent ailleurs.

**Du côté des coûts de transformation**, les écarts sont réels : le prix de l'électricité varie fortement d'une province ou d'un État à l'autre, et la lyophilisation est un procédé énergivore — la machine tourne 24 à 48 heures par cycle, avec un groupe froid et une pompe à vide en fonctionnement continu. Un opérateur québécois bénéficiant de tarifs hydroélectriques n'a pas la même structure de coût qu'un opérateur du nord-est américain.

**Du côté réglementaire**, les régimes d'inspection, d'étiquetage et de déclaration diffèrent. Un produit conforme d'un côté ne l'est pas automatiquement de l'autre, en particulier sur l'étiquetage nutritionnel, le bilinguisme et les allégations de santé.

**Du côté logistique**, le passage frontalier ajoute des délais, des formalités et un risque de retenue. Pour un produit à longue conservation, ce risque est moindre que pour du frais — c'est d'ailleurs l'un des arguments économiques de la lyophilisation — mais il n'est pas nul.

## Ce que cela change concrètement

**Pour un producteur canadien.** Vous n'avez pas de désavantage de prix affiché face au marché américain. Si vos coûts de production sont compétitifs, vos prix de vente peuvent l'être aussi. L'obstacle à l'exportation, s'il y en a un, est réglementaire et logistique — pas tarifaire.

**Pour un acheteur.** Chercher un fournisseur américain dans l'espoir d'un meilleur prix au kilo est une fausse piste. Les écarts réels que nous observons tiennent au format d'emballage et à la catégorie, pas au pays du vendeur. Un même produit acheté en grand format plutôt qu'en portion coûte 57 % moins cher au kilo — un levier bien supérieur au choix du pays.

**Pour quiconque construit un plan d'affaires.** Utiliser les prix américains comme référence est légitime. Ils ne sont ni un plancher ni un plafond par rapport au marché canadien : ils sont la même chose.

## Les limites de cette comparaison

Trois réserves, à poser avant d'en tirer une décision.

**L'échantillon canadien est plus petit.** Onze marchands exploitables contre dix-sept. Un marchand canadien atypique pèse donc davantage sur la médiane canadienne que son équivalent américain sur la médiane américaine.

**Le mélange de produits n'est pas identique.** Les catalogues canadiens de notre échantillon comptent proportionnellement plus de confiseries, les américains plus de repas de plein air et de conserves de longue conservation. Une partie de l'écart résiduel de 2 % vient probablement de là plutôt que d'une différence de prix réelle.

**Ce sont des prix affichés au détail.** Ils ne disent rien des prix négociés en gros, ni des tarifs de transformation à façon, où les structures de coûts diffèrent bel et bien entre les deux pays.

## La saisonnalité, elle, est bien commune aux deux pays

Un facteur que les prix affichés ne montrent pas mais qui structure l'activité des deux côtés de la frontière : la demande de transformation n'est pas régulière dans l'année.

Les opérateurs qui nous ont décrit leur année situent le sommet entre **mai et août**, quand les récoltes arrivent et que la matière fraîche est abondante et bon marché. L'activité ralentit de **septembre à novembre**, et décembre est un creux.

Cette forme suit la disponibilité de la matière première, pas la demande du consommateur final — qui achète des collations lyophilisées toute l'année. C'est une caractéristique du travail à façon plutôt que de la vente de produit fini.

Pour un producteur, la conséquence est pratique : la capacité est rare exactement quand la matière est abondante. Un acheteur qui planifie une transformation en juillet doit réserver bien plus tôt qu'un acheteur qui la planifie en février, et il paiera plus cher pour la même chose.

Nous ne disposons pas encore d'assez d'observations pour chiffrer l'écart de prix entre haute et basse saison. C'est l'une des données que nous cherchons à documenter.

## Comment ces chiffres ont été obtenus

Les prix ont été lus dans les catalogues publics des marchands, avec l'URL et la date de chaque observation. Seules les lignes où le marchand publie lui-même le poids net entrent dans le calcul : sans poids, aucun prix au kilogramme n'est calculable, et une estimation aurait été une invention.

Les prix américains sont convertis en dollars canadiens au taux du ${OBSERVED}. Le taux est consigné avec les données, de sorte que la comparaison peut être refaite à un autre taux sans recollecter quoi que ce soit. C'est une précaution qui compte : une variation de change de 10 % déplacerait la médiane américaine de 17 $, soit huit fois l'écart que nous mesurons.

---

*Relevé du ${OBSERVED}. 553 observations retenues au Canada et aux États-Unis sur 926 au total. Le détail par catégorie et par marchand est sur la page [intelligence de marché](/market-intelligence).*`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "pourquoi-prix-produits-lyophilises-varient-autant",
    title: "Pourquoi les prix des produits lyophilisés varient du simple au centuple",
    category: "Données de marché",
    tags: ["prix", "format", "emballage", "analyse"],
    seo_description:
      "De 11 $ à 1 000 $ le kilo dans le même relevé. Le format d'emballage explique l'essentiel — et l'avantage du gros format s'épuise vers 150 g.",
    body: `Dans notre relevé, le produit lyophilisé le moins cher revient à 11 $ le kilogramme. Le plus cher, à 1 000 $. Un facteur de quatre-vingt-dix entre les deux, pour des produits qui sortent tous du même procédé.

Cette dispersion n'est ni une erreur ni une anomalie. Elle s'explique, et l'explication est utile à quiconque fixe un prix ou en négocie un.

## Le format d'emballage explique l'essentiel

Le facteur le plus puissant n'est ni la catégorie, ni le pays, ni la marque. C'est la taille de l'emballage.

Prix médian au kilogramme selon le format, tous produits confondus :

- **Moins de 50 g** — 257 $/kg. 105 observations chez 16 marchands.
- **50 à 150 g** — 158 $/kg. 302 observations chez 23 marchands.
- **150 à 500 g** — 111 $/kg. 197 observations chez 18 marchands.
- **500 g à 2 kg** — 120 $/kg. 224 observations chez 15 marchands.
- **Plus de 2 kg** — 145 $/kg. 98 observations chez 8 marchands.

Entre la portion unique et le format de 150 à 500 g, le prix au kilo chute de 57 %. C'est un écart considérable, et parfaitement logique : le sachet, l'impression, la fermeture, la manutention et la place en rayon coûtent presque autant pour 30 g que pour 300 g. Répartis sur dix fois plus de produit, ces coûts fixes s'effondrent au kilo.

## Mais l'avantage du gros format s'arrête

Voilà le résultat contre-intuitif, et c'est celui qui compte.

**La courbe cesse de descendre après 150 à 500 g. Elle remonte même.** Un contenant de plus de 2 kg revient à 145 $/kg, soit 31 % de plus que la tranche de 150 à 500 g.

Nous avons soupçonné un artefact : peut-être que les gros formats contiennent simplement des produits différents et plus chers. Nous avons donc refait le calcul sur les fruits seuls, où les produits sont directement comparables entre eux.

Même forme. 343 $/kg sous 50 g, 193 $ entre 50 et 150 g, 143 $ entre 150 et 500 g, 143 $ entre 500 g et 2 kg, puis 162 $ au-delà de 2 kg.

La remontée est donc réelle, pas un effet de composition. C'est un résultat qu'il vaut la peine de garder en tête, parce qu'il contredit l'intuition commerciale la plus répandue du secteur.

## Trois explications plausibles

Nous ne pouvons pas trancher avec les seules données de prix, mais trois mécanismes sont cohérents avec ce qu'on observe.

**Le grand format sort du circuit de détail courant.** Au-delà de 2 kg, on quitte l'épicerie pour la réserve d'urgence, la conserve de longue durée, le contenant spécialisé. Ces produits portent des coûts que le sachet n'a pas : boîte métallique, absorbeur d'oxygène, garantie de conservation sur vingt-cinq ans. Ils s'adressent à un acheteur qui paie pour la durée, pas pour le prix au kilo.

**Les volumes sont faibles.** Seules 98 observations chez 8 marchands peuplent cette tranche, contre 302 chez 23 marchands dans la tranche de 50 à 150 g. Un produit vendu en petite série ne bénéficie d'aucune économie d'échelle en production, quelle que soit la taille du contenant.

**Le vrai gros volume ne se vend pas au catalogue.** Un acheteur qui veut 50 kg de fraises lyophilisées ne clique pas sur un bouton : il demande une soumission. Les prix véritablement dégressifs existent, mais hors des pages que nous relevons.

Cette dernière hypothèse est corroborée par un cas visible dans nos données. Un producteur québécois publie sa courbe de volume : 280 $/kg pour 250 g, 250 $/kg pour 500 g, 225 $/kg pour 1 kg, et mentionne « 1 kg ou plus sur demande ». La dégressivité continue bien — mais au-delà, elle passe par une conversation, pas par un catalogue.

## La catégorie compte moins qu'on croit

Une fois le format neutralisé, l'écart entre catégories se resserre nettement. Les médianes vont de 126 $/kg pour les repas complets à 178 $/kg pour les fruits — un rapport de 1 à 1,4, sans commune mesure avec le facteur 90 de l'ensemble.

Autrement dit : un sachet de bonbons de 30 g et un sac de fruits de 400 g diffèrent bien plus par leur format que par leur contenu.

## Ce qui reste après le format

Même à format et catégorie constants, l'écart demeure large. En fruits, la moitié centrale du marché s'étend de 126 $ à 269 $/kg. Un facteur de deux entre un fruit lyophilisé bon marché et un fruit lyophilisé cher, tous deux parfaitement ordinaires.

Quatre facteurs expliquent ce résidu.

**La matière première elle-même.** Une framboise coûte plusieurs fois le prix d'une pomme avant même d'entrer dans la machine. Comme la lyophilisation concentre la masse d'un facteur cinq à dix, elle concentre aussi cet écart de coût.

**Le rendement au séchage.** Un aliment à 92 % d'eau laisse 80 g de produit sec par kilo de frais. Un aliment à 75 % en laisse 250 g. À prix de matière égal, le coût matière par kilo de produit fini varie du simple au triple.

**Les certifications.** Biologique, sans gluten, cachère : chacune ajoute un coût de conformité et un positionnement de prix.

**Le canal de vente.** Un produit vendu en direct par son fabricant n'a pas la marge d'un intermédiaire à absorber. Notre registre compte beaucoup de vendeurs directs, ce qui tire probablement les médianes vers le bas par rapport à ce qu'on observerait en épicerie.

## Un exemple chiffré

Prenons un producteur qui veut vendre des fraises lyophilisées en sachets de 40 g.

Il ne doit pas se comparer à la médiane des fruits (178 $/kg), qui est tirée par des formats plus grands. Sa référence est la tranche de moins de 50 g, où la médiane des fruits atteint 343 $/kg.

À 343 $/kg, un sachet de 40 g se vend 13,70 $. S'il vise le premier quartile de sa tranche, il descend autour de 8 $; s'il vise le troisième, il monte vers 20 $.

Côté coût : les fraises perdent environ 90 % de leur masse. Un sachet de 40 g demande donc environ 400 g de fraises fraîches. À 6 $/kg de fraises, cela fait 2,40 $ de matière, auxquels s'ajoutent le temps de machine, l'emballage et la distribution.

L'écart entre 2,40 $ de matière et 13,70 $ de prix de vente n'est pas une marge : c'est ce qui doit couvrir tout le reste. C'est précisément pour cela qu'un producteur doit connaître son coût de cycle avant de fixer son prix.

## Le facteur que ces prix ne montrent pas : la saison

Les prix relevés sont ceux d'un jour donné. Ils ne montrent pas un facteur qui, du côté de la transformation, pèse lourd : la saison.

Les opérateurs qui ont décrit leur année situent le sommet d'activité entre **mai et août**, quand les récoltes arrivent. L'activité ralentit de **septembre à novembre**, et décembre est un creux.

Cette forme suit la disponibilité de la matière première. Elle crée une tension particulière : la capacité de machine est la plus disputée au moment précis où la matière est la moins chère. Un producteur qui veut transformer sa propre récolte se retrouve en concurrence avec tous les autres producteurs de sa région, au même moment.

Pour un produit fini vendu au détail, cet effet est amorti — le stock se constitue en été et se vend toute l'année. Mais il explique une partie de la dispersion des coûts en amont, et donc des prix en aval chez les petits producteurs qui n'ont pas les moyens de stocker.

## Ce qu'il faut en retenir

**Comparez à format égal.** Se comparer à « la médiane des fruits lyophilisés » n'a pas de sens si vous vendez en sachets de 40 g et que la médiane est tirée par des sacs de 400 g.

**N'attendez pas de prime au très gros format.** Si vous vendez au détail, l'optimum de prix au kilo se situe entre 150 et 500 g. Au-delà, vous ne gagnerez de volume que si vous apportez autre chose — conservation longue, contenant spécialisé, ou un vrai prix de gros négocié.

**Méfiez-vous des moyennes.** Dans plusieurs catégories, la moyenne dépasse la médiane de 25 à 88 % parce que quelques produits de niche très chers la tirent. Fiez-vous à la médiane et à l'intervalle du premier au troisième quartile.

## Méthode

926 observations chez 67 marchands, relevées le ${OBSERVED} dans les catalogues publics. Chaque observation porte l'URL de sa fiche produit et sa date.

Seules les lignes dont le marchand publie lui-même le poids net entrent dans les calculs. Les bandes de format ne sont retenues que si au moins trois marchands distincts les soutiennent.

---

*Le jeu de données complet est consultable sur la page [intelligence de marché](/market-intelligence).*`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "marche-mondial-lyophilisation-ce-que-les-chiffres-cachent",
    title: "Le marché mondial de la lyophilisation : ce que les chiffres publiés cachent",
    category: "Analyse",
    tags: ["marché mondial", "croissance", "prévisions", "méthode"],
    seo_description:
      "Pour la même année 2025, quatre cabinets publient 32,3 G$, 32,4 G$, 36,5 G$ et 42,8 G$. Comment lire ces écarts et ce qu'on peut réellement en conclure.",
    body: `Toute recherche sur la taille du marché des aliments lyophilisés renvoie le même type de phrase : « le marché mondial atteindra X milliards de dollars d'ici 2035, avec une croissance annuelle de Y % ». Ces phrases sont reprises telles quelles par des dizaines de sites, y compris par des concurrents du secteur.

Il vaut la peine de regarder ce que ces chiffres valent réellement.

## Quatre cabinets, quatre chiffres, la même année

Voici ce que publient différentes maisons d'études pour la **taille du marché mondial des aliments lyophilisés en 2025** :

- **32,3 G$ US** — [Future Market Insights](https://www.futuremarketinsights.com/reports/freeze-dried-food-market)
- **32,36 G$ US** — [Precedence Research](https://www.precedenceresearch.com/freeze-dried-food-market)
- **36,45 G$ US** — [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/freeze-dried-food-market)
- **42,8 G$ US** — [Business Research Insights](https://www.businessresearchinsights.com/market-reports/freeze-dried-food-market-118882)

Entre le plus bas et le plus haut, l'écart est de **32 %**. Plus de dix milliards de dollars, pour la même industrie, la même année.

Les taux de croissance annuels composés divergent aussi, quoique moins :

- 6,28 % — Precedence Research
- 6,3 % — Future Market Insights
- 6,65 % — Market Reports World
- 7 % — Business Research Insights
- 8,03 % — Mordor Intelligence

## Pourquoi un tel écart

Ces divergences ne signalent pas que certains cabinets se trompent. Elles signalent que la question « quelle est la taille de ce marché » n'a pas de réponse unique tant qu'on n'a pas dit ce qu'on compte.

**Le périmètre change tout.** Compte-t-on le café instantané lyophilisé ? Il représente à lui seul un volume énorme et il est lyophilisé au sens strict. Les ingrédients vendus à l'industrie agroalimentaire ? Les aliments pour animaux, segment en forte croissance ? Les produits pharmaceutiques lyophilisés, qui utilisent exactement le même procédé mais relèvent d'une autre industrie ? Selon les inclusions, on double ou on divise par deux.

**Le niveau de prix change tout.** Un marché peut se mesurer au prix sortie d'usine, au prix de gros ou au prix de détail. L'écart entre les deux extrêmes atteint facilement un facteur trois. Un rapport qui annonce un « marché » sans préciser à quel niveau de la chaîne il se place laisse le lecteur libre de comprendre ce qu'il veut.

**La méthode reste opaque.** Ces rapports se vendent plusieurs milliers de dollars, et leur méthodologie n'est pas publique. Il est impossible de savoir si le chiffre repose sur des données douanières, sur des entretiens avec des industriels, sur une extrapolation à partir de quelques acteurs cotés, ou sur un mélange des trois.

**L'année de base n'est pas toujours mesurée.** Beaucoup de rapports publiés en 2025 donnent un chiffre 2025 qui est déjà une projection à partir de 2023 ou 2024. La « mesure » est en réalité une extrapolation de deux ans.

## Ce qu'on peut raisonnablement en conclure

Malgré ces réserves, un point fait consensus et mérite d'être retenu : **toutes les sources convergent sur une croissance soutenue, comprise entre 6 % et 8 % par an**.

C'est le seul énoncé que les données publiques permettent de tenir avec confiance. Un marché en croissance à un chiffre élevé, sur une décennie, double approximativement de taille. Cela suffit largement à orienter une décision d'investissement, sans qu'il soit nécessaire de savoir si le point de départ est de 32 ou de 43 milliards.

Ce qui est en revanche déconseillé : citer un chiffre unique comme s'il faisait autorité. C'est ce que font la plupart des sites du secteur, en reprenant le chiffre du premier rapport trouvé. Un lecteur qui recoupe deux sources y perd immédiatement confiance — et un moteur de recherche qui pondère les sources fait le même calcul.

## Les moteurs de croissance, eux, sont observables

Là où les projections divergent, les causes de la croissance se constatent directement.

**Le poids et la conservation.** La lyophilisation retire 80 à 90 % de la masse d'un aliment tout en préservant sa structure. Sur une chaîne logistique mondiale, cela transforme l'économie du transport : un conteneur de fruits lyophilisés porte plusieurs fois la valeur alimentaire d'un conteneur de fruits frais, sans réfrigération. Un produit qui se conserve des années à température ambiante n'a besoin ni de chaîne du froid ni de conservateurs.

**La qualité nutritionnelle.** Contrairement au séchage thermique, la sublimation n'expose pas l'aliment à la chaleur. Les vitamines thermosensibles survivent, la couleur et la forme restent proches du frais, et la réhydratation prend quelques minutes. C'est ce qui distingue le procédé de la déshydratation classique, et c'est ce qui justifie son surcoût.

**L'arrivée de segments entièrement nouveaux.** Le bonbon lyophilisé n'existait pratiquement pas il y a cinq ans. C'est aujourd'hui une catégorie à part entière : dans notre propre registre de 74 marchands nord-américains et mexicains, **26 vendent des confiseries lyophilisées** — soit plus d'un tiers.

Ce dernier point mérite d'être souligné. Les projections à dix ans sont construites en prolongeant les catégories existantes. Elles capturent mal l'apparition de catégories nouvelles — et c'est précisément là que la croissance récente s'est produite. Un rapport rédigé en 2021 ne pouvait pas prévoir le bonbon lyophilisé, parce qu'il n'y avait rien à extrapoler.

## Ce que nous mesurons nous-mêmes

Nous ne publions pas d'estimation de la taille du marché mondial, faute de méthode défendable pour en produire une.

Ce que nous publions, en revanche, ce sont des prix réels, relevés dans les catalogues publics des marchands, avec l'URL et la date de chaque observation. Au ${OBSERVED} : 5 440 lignes de produits chez 67 marchands dans 7 pays, dont 926 avec un prix au kilogramme calculable.

C'est un périmètre beaucoup plus étroit qu'un rapport de marché. Il a l'avantage d'être entièrement vérifiable : chaque chiffre renvoie à une page que n'importe qui peut ouvrir. Et il porte sur la seule question à laquelle un opérateur ou un acheteur a besoin d'une réponse précise — non pas « combien pèse ce marché », mais « à quel prix se vend ce produit ».

## Comment lire un rapport de marché

Trois questions à poser avant de citer un chiffre trouvé dans ce type de publication :

1. **Quel périmètre ?** Café inclus ou non, pharmaceutique inclus ou non, aliments pour animaux inclus ou non. Si le résumé gratuit ne le dit pas, le chiffre n'est pas comparable à un autre.
2. **Quel niveau de prix ?** Sortie d'usine, gros ou détail.
3. **Quelle année de base, et quelle part de projection ?** Un chiffre pour 2035 est une extrapolation, pas une mesure. Un chiffre pour l'année courante en est souvent une aussi.

Si les trois réponses manquent, le chiffre peut servir d'ordre de grandeur dans une conversation. Il ne peut pas servir de fondement à un plan d'affaires ni de justification à un investissement.

## Ce que les segments recouvrent réellement

Les rapports découpent généralement le marché en quatre ou cinq segments. Il vaut la peine de comprendre ce que chacun pèse, parce que la croissance ne s'y répartit pas également.

**Le café et les boissons instantanées** constituent historiquement le plus gros volume lyophilisé au monde. C'est un marché mûr, à croissance faible, dominé par quelques industriels. Son inclusion ou son exclusion explique une bonne part de l'écart entre les estimations citées plus haut.

**Les ingrédients pour l'industrie agroalimentaire** — fruits en morceaux pour les céréales, poudres pour les préparations, arômes — forment un marché B2B peu visible du public mais substantiel, et c'est celui où la lyophilisation à façon trouve ses plus gros clients.

**Les repas de plein air et les réserves d'urgence** sont le segment le plus visible et le plus anciennement associé au procédé. Sa croissance est réelle mais suit des cycles liés à l'actualité — les épisodes de perturbation logistique ou climatique déclenchent des pointes de demande.

**Les collations de détail**, incluant fruits et confiseries, sont le segment le plus récent et le plus dynamique. C'est aussi celui où les barrières d'entrée sont les plus faibles, ce qui explique la multiplication des petits acteurs.

**L'alimentation animale** progresse rapidement, portée par les mêmes arguments nutritionnels que l'alimentation humaine.

Un chiffre global masque donc des dynamiques très différentes. Une croissance moyenne de 7 % peut recouvrir un segment mûr à 2 % et un segment neuf à 30 %.

## Une note sur l'honnêteté des chiffres

Nous aurions pu ouvrir cet article par « le marché mondial de la lyophilisation atteindra 59 milliards de dollars d'ici 2035 ». C'est une phrase vraie au sens où un cabinet l'a écrite, et elle aurait été reprise sans difficulté.

Nous ne l'avons pas fait, parce qu'elle donne une fausse impression de précision. Dire « entre 6 et 8 % de croissance annuelle, selon cinq sources qui ne s'accordent pas sur le point de départ » est moins spectaculaire et plus utile.

---

*Sources externes consultées le ${OBSERVED}. Les données de prix citées proviennent du relevé LyoDex, consultable sur la page [intelligence de marché](/market-intelligence).*`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "democratisation-lyophilisation-petits-producteurs",
    title: "La démocratisation de la lyophilisation : quand un procédé industriel devient accessible",
    category: "Analyse",
    tags: ["démocratisation", "équipement", "petits producteurs", "bonbons"],
    seo_description:
      "Un lyophilisateur d'entrée de gamme coûte 1 695 $ US. Dans notre registre de 74 marchands, 21 sont de petites boutiques. Ce que cela change pour le secteur.",
    body: `Il y a vingt ans, lyophiliser un aliment exigeait un équipement industriel, un local adapté et un investissement de plusieurs centaines de milliers de dollars. Le procédé appartenait aux grands transformateurs, aux fabricants de café instantané et à l'industrie pharmaceutique.

Ce n'est plus le cas, et notre registre de marchands le montre assez nettement.

## Le prix de l'équipement a changé d'échelle

Un lyophilisateur domestique d'entrée de gamme est aujourd'hui affiché à **1 695 $ US** en promotion, contre 2 495 $ hors promotion, chez [Harvest Right](https://harvestright.com/pages/home-freeze-dryers), principal fabricant de ce segment.

Ses capacités annoncées : 6 à 10 livres d'aliments frais par cycle, jusqu'à 1 800 livres — environ 800 kg — par an.

Ce n'est pas un jouet, et ce n'est pas non plus un équipement industriel. C'est exactement l'échelle qui manquait : assez petit pour être acheté par une personne, assez productif pour soutenir une activité commerciale modeste.

## L'économie de la petite unité

Faisons le calcul, en gardant à l'esprit que ce sont des ordres de grandeur et non une projection d'affaires.

800 kg de matière fraîche par an donnent, selon le taux d'humidité, de l'ordre de 80 à 160 kg de produit fini. Aux médianes que nous relevons — environ 167 $ CA/kg en confiseries — cela représente un chiffre d'affaires théorique de 13 000 à 27 000 $ par an, pour une machine qui en coûte moins de 3 000.

Ce calcul ignore volontairement plusieurs postes : la matière première, l'électricité d'un cycle de 24 à 48 heures, l'emballage, le local, le temps de travail, les permis et la perte. Il ne démontre donc pas une rentabilité. Il démontre qu'à cette échelle, l'équipement cesse d'être l'obstacle principal — ce qui n'était pas vrai auparavant.

C'est un déplacement important : quand la machine coûtait 200 000 $, la question était « puis-je financer l'équipement ». Quand elle en coûte 3 000, la question devient « ai-je un marché, un local conforme et le temps ».

## Ce que le registre montre

Nous avons constitué un registre de 74 marchands de produits lyophilisés au Canada, aux États-Unis et au Mexique. La répartition par type est parlante :

- **30 boutiques en vente directe** — de petites structures, souvent une ou deux personnes
- **30 marques en vente directe** — des entreprises constituées avec un catalogue et une identité
- **9 manufacturiers ou acteurs B2B** — les industriels au sens classique

Autrement dit, **les petites structures représentent près de la moitié du registre**. Ce n'est pas la composition d'un secteur industriel mûr, c'est celle d'un secteur en cours d'ouverture.

## Le bonbon lyophilisé, révélateur du phénomène

La catégorie qui illustre le mieux cette ouverture est le bonbon lyophilisé.

Dans notre registre, **26 marchands sur 74 vendent des confiseries lyophilisées. Parmi eux, 21 sont de petites boutiques en vente directe.** Répartition géographique : 12 au Canada, 12 aux États-Unis, 2 au Mexique.

Pourquoi cette catégorie précisément ? Parce qu'elle correspond exactement aux contraintes d'une petite machine.

**La matière première est bon marché et stable.** Un sac de bonbons du commerce ne demande ni approvisionnement agricole, ni chaîne du froid, ni saisonnalité. On peut en acheter le lundi et transformer le mardi.

**La transformation crée une valeur immédiatement visible.** Un bonbon lyophilisé change de texture et de volume de façon spectaculaire. Le produit se vend par sa nouveauté autant que par son goût, ce qui autorise un prix sans rapport avec le coût de la matière.

**Le cycle est court et prévisible.** Les fabricants de machines domestiques proposent désormais des modes spécifiques pour la confiserie, ce qui indique que le segment est assez important pour justifier du développement logiciel dédié.

**Le prix au kilo est élevé.** À 167 $ CA/kg de médiane, avec une moitié centrale du marché entre 113 $ et 243 $, la marge sur une matière première peu coûteuse est substantielle.

À l'inverse, un fruit demande un approvisionnement saisonnier, un tri, une préparation, et perd 90 % de sa masse — il faut dix kilos de frais pour un kilo de fini. La barrière d'entrée y reste bien plus haute.

## Ce que cela change pour le secteur

**Pour les industriels.** La concurrence ne vient plus seulement d'autres industriels. Elle vient d'une multitude de petits acteurs qui occupent des niches trop étroites pour justifier une ligne de production. Ces acteurs ne prennent pas de parts de marché sur les gros volumes, mais ils occupent le terrain sur les produits de spécialité et sur la relation directe au client.

**Pour les producteurs agricoles.** Un maraîcher qui perd une partie de sa récolte faute de débouché frais dispose maintenant d'une option à quelques milliers de dollars pour transformer ce surplus en produit à longue conservation. C'est un changement de nature dans l'économie d'une petite ferme : le surplus cesse d'être une perte pour devenir un stock.

**Pour les acheteurs.** L'offre s'est fragmentée. Trouver un transformateur capable de traiter un petit volume, ou disposé à développer un produit sur mesure, est devenu réaliste. C'est précisément le problème que LyoDex existe pour résoudre : un marché fragmenté est un marché où l'information circule mal, où les prix ne sont pas comparables et où l'acheteur ne sait pas qui existe.

## Les limites de la démocratisation

Il faut être précis sur ce qui est devenu accessible et ce qui ne l'est pas.

**La capacité reste modeste.** 800 kg de matière fraîche par an, c'est un peu plus de 2 kg par jour. Une machine domestique ne remplace pas un lyophilisateur industriel, elle occupe un créneau différent.

**Le temps de cycle ne se comprime pas.** Un cycle dure de 24 à 48 heures selon la matière et l'épaisseur du chargement. C'est une contrainte physique de la sublimation, indépendante du prix de la machine. Une petite unité ne fait pas plus de cycles par an qu'une grande — elle en fait autant, avec moins dedans.

**La conformité alimentaire ne s'achète pas avec la machine.** Vendre au public exige un local conforme, des procédures d'hygiène et, selon la province et le canal de vente, des permis. Beaucoup de projets s'arrêtent là, et c'est aujourd'hui la barrière d'entrée principale — bien avant le prix de l'équipement.

**Les certifications restent hors de portée.** Une certification de qualité alimentaire reconnue, ou a fortiori pharmaceutique, demande des investissements et une documentation sans rapport avec le prix d'un lyophilisateur domestique. La démocratisation ouvre le marché du produit fini vendu en direct, pas celui de la transformation à façon pour l'industrie.

## Le chemin réglementaire, obstacle réel

Puisque l'équipement n'est plus la barrière principale, il vaut la peine de nommer celle qui l'a remplacée.

Vendre un aliment transformé au public suppose, dans la plupart des juridictions nord-américaines, quatre choses distinctes :

**Un lieu de transformation conforme.** Une cuisine résidentielle ordinaire ne suffit généralement pas pour une vente au public au-delà de circuits très encadrés. Les exigences portent sur les surfaces, la séparation des zones, l'eau, l'évacuation et l'entreposage.

**Un permis d'exploitation.** Sa nature et son autorité de délivrance varient selon la province ou l'État, et selon que la vente est locale, interprovinciale ou exportée.

**Un étiquetage conforme.** Liste d'ingrédients, allergènes, tableau de valeur nutritive, poids net, coordonnées du responsable. Au Canada, l'étiquetage bilingue s'ajoute. Les seuils qui déclenchent l'obligation d'un tableau nutritionnel complet dépendent de la taille de l'entreprise et du canal de vente.

**Une traçabilité.** Savoir quel lot de matière première est entré dans quel lot de produit fini, et pouvoir le démontrer en cas de rappel.

Aucune de ces exigences n'est insurmontable, mais ensemble elles représentent un travail administratif que l'achat d'une machine ne prépare pas. C'est là que s'arrêtent beaucoup de projets, et c'est pour cela qu'on trouve dans les registres autant de boutiques qui vendent des bonbons — matière première déjà transformée et étiquetée par un industriel — que de transformateurs de produits agricoles bruts.

Ce déplacement de la barrière d'entrée, du capital vers la conformité, est peut-être le vrai changement structurel du secteur.

## Ce qui n'est pas encore mesurable

Nous ne pouvons pas dire à quelle vitesse ce phénomène progresse. Notre registre est une photographie datée du ${OBSERVED} : il montre une composition, pas une trajectoire.

Il faudra un second relevé, dans plusieurs mois, pour dire si la part des petites structures augmente, se stabilise ou reflue. Beaucoup de ces boutiques sont récentes, et l'histoire des secteurs à faible barrière d'entrée suggère qu'une partie ne survivra pas à ses deux premières années. Une catégorie qui se vend par sa nouveauté est aussi une catégorie dont la nouveauté s'épuise.

Ce que l'on peut affirmer aujourd'hui : au ${OBSERVED}, près de la moitié des marchands recensés en Amérique du Nord sont de petites structures, et plus d'un tiers vendent une catégorie de produits qui n'existait pratiquement pas il y a cinq ans.

---

*Registre de 74 marchands au Canada, aux États-Unis et au Mexique, constitué au ${OBSERVED}. Prix de l'équipement relevé sur le site du fabricant à la même date. Les données de prix complètes sont consultables sur la page [intelligence de marché](/market-intelligence). Pour les questions de base sur le procédé : [la FAQ](/faq).*`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

const client = await pool.connect();
let inserted = 0, updated = 0;

try {
  // Posts need an author row; the first admin stands in for the platform byline.
  const { rows: admins } = await client.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1",
  );
  if (!admins.length) {
    console.error("\n  No admin user found. Run scripts/admin/create-admin.mjs first.\n");
    process.exit(1);
  }
  const authorId = admins[0].id;

  await client.query("BEGIN");

  for (const a of ARTICLES) {
    const words = a.body.split(/\s+/).length;
    const res = await client.query(
      `INSERT INTO blog_posts
         (slug, title, body, seo_description, category, author, tags, status, published_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'published', now(), $8)
       ON CONFLICT (slug) DO UPDATE SET
         title           = EXCLUDED.title,
         body            = EXCLUDED.body,
         seo_description = EXCLUDED.seo_description,
         category        = EXCLUDED.category,
         tags            = EXCLUDED.tags,
         updated_at      = now()
       RETURNING (xmax = 0) AS was_insert`,
      [a.slug, a.title, a.body, a.seo_description, a.category, AUTHOR, a.tags, authorId],
    );
    if (res.rows[0].was_insert) inserted++; else updated++;
    console.log(`  ${String(words).padStart(5)} mots  ${a.slug}`);
  }

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed, nothing was written:", err.message);
  process.exit(1);
} finally {
  client.release();
}

console.log(`\ninserted ${inserted}  ·  updated ${updated}`);
await pool.end();
