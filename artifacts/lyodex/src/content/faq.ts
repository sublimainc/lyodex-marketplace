/**
 * FAQ content, in the three languages the site serves.
 *
 * Kept out of translations.ts on purpose: that file holds interface strings,
 * which are short and change with the UI. This is long-form editorial content
 * that changes with what is true about the market, and it is the page most
 * likely to be quoted verbatim by a generative search engine. Mixing the two
 * would make both harder to maintain.
 *
 * Two rules govern every answer below.
 *
 * LyoDex is a marketplace and a directory. It does not own a freeze-dryer, does
 * not process anyone's material, and does not sell finished product. Questions
 * phrased as "do you offer…" are answered about what the platform does, and
 * redirected to the operators who actually do the work. Answering as though
 * LyoDex were a processor would be false, and would also fail on its own terms:
 * an engine that detects an entity claiming to be something it is not stops
 * treating it as a reliable source for either role.
 *
 * Where a question is about freeze-drying itself rather than about LyoDex, it is
 * answered plainly and completely. Being the page that actually answers the
 * question is the whole mechanism by which a site gets cited.
 */

export interface FaqItem {
  /** Stable across languages — used for anchors and for the JSON-LD id. */
  id: string;
  q: string;
  /**
   * Two to four sentences. Generative engines extract a short passage; an answer
   * that buries the fact in paragraph three does not get quoted.
   */
  a: string;
  /** Optional internal link the answer earns. */
  link?: { href: string; label: string };
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: Record<"fr" | "en" | "es", { intro: string; sections: FaqSection[] }> = {
  // ─────────────────────────────────────────────────────────────── FRANÇAIS ──
  fr: {
    intro:
      "Réponses aux questions les plus fréquentes sur la lyophilisation alimentaire et sur le fonctionnement de LyoDex. " +
      "Les prix cités proviennent de relevés réels, avec leur source et leur date.",
    sections: [
      {
        id: "comprendre",
        title: "Comprendre la lyophilisation",
        items: [
          {
            id: "quest-ce-que-la-lyophilisation",
            q: "Qu'est-ce que la lyophilisation ?",
            a: "La lyophilisation, ou cryodessiccation, retire l'eau d'un aliment congelé en la faisant passer directement de l'état solide à l'état gazeux, sous vide poussé. C'est ce qu'on appelle la sublimation. Comme l'aliment ne dégèle jamais, sa structure cellulaire reste intacte : il conserve sa forme, sa couleur et l'essentiel de ses nutriments, et il se réhydrate en quelques minutes.",
          },
          {
            id: "entreprise-de-lyophilisation",
            q: "Qu'est-ce qu'une entreprise de lyophilisation ?",
            a: "C'est une entreprise qui exploite des lyophilisateurs industriels pour sécher des aliments ou d'autres matières. Certaines vendent leurs propres produits finis, d'autres travaillent à façon pour des clients qui leur confient leur matière première, et beaucoup font les deux. Le travail à façon s'appelle aussi lyophilisation contractuelle ou co-manufacturing.",
            link: { href: "/operators", label: "Voir les opérateurs répertoriés" },
          },
          {
            id: "lyophilisation-vs-deshydratation",
            q: "Quelle est la différence entre lyophilisation et déshydratation ?",
            a: "La déshydratation évapore l'eau par la chaleur : l'aliment rétrécit, brunit et perd une partie de ses vitamines thermosensibles. La lyophilisation sublime l'eau à froid sous vide : le produit garde son volume, sa couleur et sa valeur nutritive, et il se réhydrate bien plus vite. En contrepartie, elle coûte nettement plus cher — l'équipement et le cycle, qui dure souvent 24 à 48 heures, sont sans commune mesure.",
          },
          {
            id: "avantages-aliments-lyophilises",
            q: "Quels sont les avantages des aliments lyophilisés ?",
            a: "Une durée de conservation qui se compte en années à température ambiante, sans agent de conservation. Une réduction de poids de l'ordre de 80 à 90 %, qui abaisse fortement les coûts de transport. Une réhydratation rapide et une texture, une couleur et une saveur proches du produit frais. Les produits lyophilisés sont aussi très légers, ce qui explique leur place en alimentation de plein air et en réserve d'urgence.",
          },
          {
            id: "quels-aliments-lyophiliser",
            q: "Quels aliments peut-on lyophiliser ?",
            a: "La plupart des aliments à teneur en eau élevée fonctionnent bien : fruits, légumes, viandes cuites, produits laitiers, yogourt, œufs, repas complets, bonbons, café et herbes. Les produits très gras se prêtent mal au procédé, parce que le gras ne sublime pas et rancit à la longue. Le miel pur et les sirops ne fonctionnent pas non plus, faute d'eau libre à sublimer.",
          },
        ],
      },
      {
        id: "prix",
        title: "Prix et coûts",
        items: [
          {
            id: "cout-service-lyophilisation",
            q: "Combien coûte un service de lyophilisation ?",
            a: "Au Québec, des prix de 6 $/kg pour les lots de 100 kg et plus, et de 8 $/kg sous 100 kg, ont été rapportés pour de l'alimentaire courant. Le prix dépend surtout du volume, de la teneur en eau de la matière, de la durée du cycle et des exigences de certification. Un produit très humide occupe la machine plus longtemps et coûte donc davantage à traiter, à poids sec égal.",
            link: { href: "/market-intelligence", label: "Voir les données de marché" },
          },
          {
            id: "prix-produits-lyophilises",
            q: "À quel prix se vendent les produits lyophilisés ?",
            a: "Un relevé des catalogues publics de 67 marchands en Amérique du Nord, en Europe et en Océanie donne une médiane de 145 $ CA le kilo, toutes catégories confondues, la moitié du marché se situant entre 95 $ et 223 $. Les fruits ressortent à 178 $/kg, les confiseries à 167 $/kg, les repas complets à 126 $/kg. Ce sont des prix de détail sur produits finis, à ne pas confondre avec un tarif de service à façon.",
            link: { href: "/market-intelligence", label: "Voir le détail par catégorie" },
          },
          {
            id: "effet-du-format",
            q: "Le prix au kilo baisse-t-il avec les gros formats ?",
            a: "Jusqu'à un certain point seulement. Le prix au kilo chute d'environ 57 % entre les portions de moins de 50 g et les formats de 150 à 500 g. Passé ce seuil, il cesse de descendre et remonte même légèrement pour les contenants de plus de 2 kg. L'avantage du gros format s'épuise donc autour de 150 g dans les prix de détail affichés.",
          },
          {
            id: "cout-lyodex",
            q: "Combien coûte l'utilisation de LyoDex ?",
            a: "La consultation de l'annuaire, de la carte des opérateurs et des données de marché est gratuite et ne demande aucun compte. La commission de la plateforme est actuellement de {fee} sur les contrats conclus. Le taux affiché sur le site est celui que le serveur applique réellement.",
            link: { href: "/pricing", label: "Détail de la tarification" },
          },
          {
            id: "minimum-de-commande",
            q: "Quel est le minimum de commande ?",
            a: "Il n'y a pas de minimum imposé par LyoDex. Chaque opérateur fixe le sien, et les seuils varient beaucoup : certains acceptent quelques kilos pour du développement de produit, d'autres ne démarrent pas une machine sous plusieurs centaines de kilos. Le minimum se précise dans la réponse à votre demande de soumission.",
          },
          {
            id: "delais-de-production",
            q: "Quels sont les délais de production ?",
            a: "Un cycle de lyophilisation dure généralement de 24 à 48 heures selon la matière et son épaisseur. Le délai réel dépend surtout de la file d'attente de l'opérateur, pas du cycle lui-même. LyoDex ne fixe aucun délai : chaque opérateur annonce le sien dans sa soumission.",
          },
        ],
      },
      {
        id: "lyodex",
        title: "À propos de LyoDex",
        items: [
          {
            id: "quest-ce-que-lyodex",
            q: "Qu'est-ce que LyoDex ?",
            a: "LyoDex est une place de marché et un annuaire qui met en relation les entreprises ayant besoin de lyophilisation avec les opérateurs qui la pratiquent, au Canada, aux États-Unis et en Europe. La plateforme ne possède aucun lyophilisateur et ne transforme aucune matière : elle sert à trouver, comparer et contracter des opérateurs, et à publier des données de prix sur un marché où elles sont rares.",
            link: { href: "/how-it-works", label: "Comment ça fonctionne" },
          },
          {
            id: "lyodex-lyophilise-t-il",
            q: "Est-ce que LyoDex lyophilise des produits ?",
            a: "Non. LyoDex n'exploite aucun équipement et ne vend aucun produit fini. Le travail est réalisé par les opérateurs indépendants répertoriés sur la plateforme, chacun avec ses propres installations, certifications et tarifs.",
          },
          {
            id: "marque-blanche",
            q: "Peut-on obtenir de la marque blanche par LyoDex ?",
            a: "LyoDex n'offre pas ce service directement, mais plusieurs opérateurs répertoriés le font, incluant le développement de produit et le conditionnement sous votre marque. Publiez une demande en décrivant votre projet et les opérateurs capables de le réaliser vous répondront.",
            link: { href: "/request", label: "Publier une demande" },
          },
          {
            id: "travailler-avec-entreprises-alimentaires",
            q: "LyoDex travaille-t-il avec les entreprises alimentaires ?",
            a: "Oui, c'est la clientèle principale de la plateforme : transformateurs, marques alimentaires, producteurs agricoles, fabricants de suppléments et distributeurs. Les acheteurs particuliers y trouvent aussi des opérateurs, mais la plupart des opérateurs répertoriés travaillent à l'échelle industrielle.",
          },
          {
            id: "trouver-entreprise-lyophilisation-quebec",
            q: "Où trouver une entreprise de lyophilisation au Québec ?",
            a: "L'annuaire LyoDex répertorie les opérateurs par région, avec leur emplacement réel sur carte, leurs services et leurs coordonnées lorsqu'elles sont publiques. Le Québec compte plusieurs entreprises actives en lyophilisation alimentaire, en travail à façon comme en produits de marque. La consultation est gratuite et sans compte.",
            link: { href: "/operator-map", label: "Consulter la carte des opérateurs" },
          },
          {
            id: "etre-liste-comme-operateur",
            q: "Comment être répertorié comme opérateur ?",
            a: "Créez un compte opérateur et renseignez votre profil : emplacement, services, capacité et certifications. L'inscription est gratuite. LyoDex n'audite pas les installations et ne certifie personne — le statut de vérification indique seulement ce qui a pu être confirmé à partir de sources publiques.",
            link: { href: "/register", label: "Créer un compte opérateur" },
          },
        ],
      },
      {
        id: "donnees",
        title: "Données et fiabilité",
        items: [
          {
            id: "origine-des-donnees",
            q: "D'où viennent les données de prix publiées ?",
            a: "Les prix de produits proviennent des catalogues publics des marchands, relevés avec l'URL et la date de chaque observation. Les prix de service proviennent d'opérateurs qui les ont rapportés directement. Aucune valeur n'est estimée : lorsqu'un marchand ne publie pas le poids net d'un produit, aucun prix au kilo n'est calculé pour cette ligne.",
            link: { href: "/trust", label: "Méthodologie complète" },
          },
          {
            id: "operateurs-verifies",
            q: "Les opérateurs sont-ils vérifiés ?",
            a: "Leur existence, leur emplacement et leurs services sont confirmés à partir de sources publiques, et chaque fiche indique ce qui a été vérifié. LyoDex n'audite aucune installation, n'inspecte aucune certification sur place et ne garantit la qualité d'aucun travail. La vérification des certifications reste à la charge de l'acheteur.",
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────── ENGLISH ──
  en: {
    intro:
      "Answers to the questions we are asked most about food freeze-drying and about how LyoDex works. " +
      "Every price quoted comes from a real observation, with its source and date.",
    sections: [
      {
        id: "understanding",
        title: "Understanding freeze-drying",
        items: [
          {
            id: "what-is-freeze-drying",
            q: "What is freeze-drying?",
            a: "Freeze-drying, or lyophilisation, removes water from frozen food by turning ice straight into vapour under a hard vacuum — a process called sublimation. Because the food never thaws, its cell structure stays intact: it keeps its shape, colour and most of its nutrients, and rehydrates in minutes.",
          },
          {
            id: "what-is-a-freeze-drying-company",
            q: "What is a freeze-drying company?",
            a: "A business that runs industrial freeze-dryers to dry food or other materials. Some sell their own finished products, some process material their customers send them, and many do both. The second is called contract freeze-drying or co-manufacturing.",
            link: { href: "/operators", label: "Browse listed operators" },
          },
          {
            id: "freeze-drying-vs-dehydration",
            q: "What is the difference between freeze-drying and dehydration?",
            a: "Dehydration evaporates water with heat: the food shrinks, browns and loses heat-sensitive vitamins. Freeze-drying sublimates the water cold, under vacuum: the product keeps its volume, colour and nutritional value, and rehydrates far faster. The trade-off is cost — the equipment and the cycle, often 24 to 48 hours, are in a different league.",
          },
          {
            id: "benefits-of-freeze-dried-food",
            q: "What are the benefits of freeze-dried food?",
            a: "Shelf life measured in years at room temperature, with no preservatives. A weight reduction of roughly 80 to 90 %, which cuts shipping costs sharply. Fast rehydration, with texture, colour and flavour close to fresh. The extreme light weight is why freeze-dried food dominates backcountry meals and emergency stores.",
          },
          {
            id: "what-foods-can-be-freeze-dried",
            q: "What foods can be freeze-dried?",
            a: "Most high-moisture foods work well: fruit, vegetables, cooked meat, dairy, yoghurt, eggs, complete meals, candy, coffee and herbs. Very fatty products are a poor fit, because fat does not sublimate and turns rancid over time. Pure honey and syrups do not work either — there is no free water to sublimate.",
          },
        ],
      },
      {
        id: "pricing",
        title: "Prices and costs",
        items: [
          {
            id: "cost-of-freeze-drying-service",
            q: "How much does a freeze-drying service cost?",
            a: "In Quebec, rates of $6/kg for batches of 100 kg and up, and $8/kg below 100 kg, have been reported for ordinary food-grade work. Price depends mainly on volume, the moisture content of the material, cycle length and certification requirements. A very wet product occupies the machine longer and therefore costs more per kilo of dry output.",
            link: { href: "/market-intelligence", label: "See market data" },
          },
          {
            id: "freeze-dried-product-prices",
            q: "What do freeze-dried products sell for?",
            a: "A survey of the public catalogues of 67 merchants across North America, Europe and Oceania gives a median of CAD 145 per kilogram across all categories, with half the market between CAD 95 and CAD 223. Fruit runs at CAD 178/kg, candy at CAD 167/kg, complete meals at CAD 126/kg. These are retail prices for finished goods, not a rate for contract drying.",
            link: { href: "/market-intelligence", label: "See the category breakdown" },
          },
          {
            id: "does-bulk-cost-less",
            q: "Does the price per kilo drop with larger packs?",
            a: "Only up to a point. Price per kilo falls about 57 % between single-serve packs under 50 g and the 150–500 g band. Past that it stops falling and even rises slightly for containers over 2 kg. The bulk advantage runs out around 150 g in published retail pricing.",
          },
          {
            id: "cost-of-lyodex",
            q: "What does LyoDex cost to use?",
            a: "Browsing the directory, the operator map and the market data is free and needs no account. The platform commission on completed contracts is currently {fee}. The rate shown on the site is the one the server actually applies.",
            link: { href: "/pricing", label: "Pricing details" },
          },
          {
            id: "minimum-order",
            q: "What is the minimum order?",
            a: "LyoDex imposes none. Each operator sets their own, and thresholds vary widely: some accept a few kilos for product development, others will not start a machine below several hundred. The minimum is stated in the response to your request for quote.",
          },
          {
            id: "lead-times",
            q: "What are typical lead times?",
            a: "A freeze-drying cycle usually runs 24 to 48 hours depending on the material and how thickly it is loaded. Real lead time depends far more on the operator's queue than on the cycle. LyoDex sets no lead time — each operator states their own in their bid.",
          },
        ],
      },
      {
        id: "about-lyodex",
        title: "About LyoDex",
        items: [
          {
            id: "what-is-lyodex",
            q: "What is LyoDex?",
            a: "LyoDex is a marketplace and directory connecting businesses that need freeze-drying with the operators who do it, across Canada, the United States and Europe. The platform owns no freeze-dryer and processes no material: it exists to find, compare and contract operators, and to publish price data in a market where almost none is public.",
            link: { href: "/how-it-works", label: "How it works" },
          },
          {
            id: "does-lyodex-freeze-dry",
            q: "Does LyoDex freeze-dry anything itself?",
            a: "No. LyoDex operates no equipment and sells no finished product. The work is done by the independent operators listed on the platform, each with their own facilities, certifications and rates.",
          },
          {
            id: "private-label",
            q: "Can I get private-label production through LyoDex?",
            a: "Not from LyoDex directly, but several listed operators offer it, including product development and packaging under your own brand. Post a request describing your project and the operators able to take it on will respond.",
            link: { href: "/request", label: "Post a request" },
          },
          {
            id: "works-with-food-businesses",
            q: "Does LyoDex work with food businesses?",
            a: "Yes — they are the platform's main audience: processors, food brands, farms, supplement makers and distributors. Individual buyers can find operators too, though most listed operators work at industrial scale.",
          },
          {
            id: "find-freeze-drying-company",
            q: "Where can I find a freeze-drying company?",
            a: "The LyoDex directory lists operators by region, with their real mapped location, their services and their contact details where those are public. Coverage is strongest in Canada and the United States. Browsing is free and needs no account.",
            link: { href: "/operator-map", label: "Open the operator map" },
          },
          {
            id: "get-listed",
            q: "How do I get listed as an operator?",
            a: "Create an operator account and fill in your profile: location, services, capacity and certifications. Listing is free. LyoDex does not audit facilities or certify anyone — the verification status only reflects what could be confirmed from public sources.",
            link: { href: "/register", label: "Create an operator account" },
          },
        ],
      },
      {
        id: "data",
        title: "Data and reliability",
        items: [
          {
            id: "where-price-data-comes-from",
            q: "Where does the published price data come from?",
            a: "Product prices are read from merchants' public catalogues, recorded with the source URL and the date of each observation. Service rates come from operators who reported them directly. Nothing is estimated: where a merchant does not publish a net weight, no price per kilo is calculated for that listing.",
            link: { href: "/trust", label: "Full methodology" },
          },
          {
            id: "are-operators-verified",
            q: "Are the operators verified?",
            a: "Their existence, location and services are confirmed from public sources, and each profile states what was checked. LyoDex audits no facility, inspects no certification on site, and guarantees no one's work. Verifying certifications remains the buyer's responsibility.",
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────── ESPAÑOL ──
  es: {
    intro:
      "Respuestas a las preguntas más frecuentes sobre la liofilización de alimentos y sobre el funcionamiento de LyoDex. " +
      "Todos los precios citados provienen de observaciones reales, con su fuente y su fecha.",
    sections: [
      {
        id: "entender",
        title: "Entender la liofilización",
        items: [
          {
            id: "que-es-la-liofilizacion",
            q: "¿Qué es la liofilización?",
            a: "La liofilización elimina el agua de un alimento congelado convirtiendo el hielo directamente en vapor bajo alto vacío, un proceso llamado sublimación. Como el alimento nunca se descongela, su estructura celular permanece intacta: conserva su forma, su color y la mayor parte de sus nutrientes, y se rehidrata en minutos.",
          },
          {
            id: "que-es-una-empresa-de-liofilizacion",
            q: "¿Qué es una empresa de liofilización?",
            a: "Una empresa que opera liofilizadores industriales para secar alimentos u otros materiales. Algunas venden sus propios productos terminados, otras procesan el material que les envían sus clientes, y muchas hacen ambas cosas. Lo segundo se llama liofilización por contrato o co-manufactura.",
            link: { href: "/operators", label: "Ver operadores listados" },
          },
          {
            id: "liofilizacion-vs-deshidratacion",
            q: "¿Cuál es la diferencia entre liofilización y deshidratación?",
            a: "La deshidratación evapora el agua con calor: el alimento se encoge, se oscurece y pierde vitaminas sensibles al calor. La liofilización sublima el agua en frío y al vacío: el producto conserva su volumen, su color y su valor nutricional, y se rehidrata mucho más rápido. A cambio cuesta bastante más — el equipo y el ciclo, que suele durar de 24 a 48 horas, no son comparables.",
          },
          {
            id: "ventajas-alimentos-liofilizados",
            q: "¿Cuáles son las ventajas de los alimentos liofilizados?",
            a: "Una vida útil de años a temperatura ambiente, sin conservantes. Una reducción de peso del orden del 80 al 90 %, que abarata mucho el transporte. Rehidratación rápida, con textura, color y sabor cercanos al producto fresco. Su ligereza extrema explica su lugar en la alimentación de montaña y en las reservas de emergencia.",
          },
          {
            id: "que-alimentos-se-pueden-liofilizar",
            q: "¿Qué alimentos se pueden liofilizar?",
            a: "La mayoría de los alimentos con alto contenido de agua funcionan bien: frutas, verduras, carnes cocidas, lácteos, yogur, huevos, platos completos, dulces, café y hierbas. Los productos muy grasos se prestan mal, porque la grasa no sublima y se enrancia con el tiempo. La miel pura y los jarabes tampoco funcionan: no hay agua libre que sublimar.",
          },
        ],
      },
      {
        id: "precios",
        title: "Precios y costos",
        items: [
          {
            id: "costo-servicio-liofilizacion",
            q: "¿Cuánto cuesta un servicio de liofilización?",
            a: "En Quebec se han reportado tarifas de 6 $/kg para lotes de 100 kg o más, y de 8 $/kg por debajo de 100 kg, para trabajo alimentario corriente. El precio depende sobre todo del volumen, del contenido de humedad del material, de la duración del ciclo y de las exigencias de certificación. Un producto muy húmedo ocupa la máquina más tiempo y por tanto cuesta más por kilo de producto seco.",
            link: { href: "/market-intelligence", label: "Ver datos de mercado" },
          },
          {
            id: "precios-productos-liofilizados",
            q: "¿A qué precio se venden los productos liofilizados?",
            a: "Un relevamiento de los catálogos públicos de 67 comerciantes en América del Norte, Europa y Oceanía arroja una mediana de 145 CAD por kilogramo en todas las categorías, con la mitad del mercado entre 95 y 223 CAD. La fruta se sitúa en 178 CAD/kg, los dulces en 167, los platos completos en 126. Son precios minoristas de productos terminados, no una tarifa de maquila.",
            link: { href: "/market-intelligence", label: "Ver el detalle por categoría" },
          },
          {
            id: "efecto-del-formato",
            q: "¿El precio por kilo baja con los formatos grandes?",
            a: "Solo hasta cierto punto. El precio por kilo cae alrededor de 57 % entre las porciones de menos de 50 g y la franja de 150 a 500 g. A partir de ahí deja de bajar e incluso sube ligeramente para los envases de más de 2 kg. La ventaja del formato grande se agota cerca de los 150 g en los precios minoristas publicados.",
          },
          {
            id: "costo-de-lyodex",
            q: "¿Cuánto cuesta usar LyoDex?",
            a: "Consultar el directorio, el mapa de operadores y los datos de mercado es gratuito y no requiere cuenta. La comisión de la plataforma sobre los contratos cerrados es actualmente de {fee}. La tasa que aparece en el sitio es la que el servidor aplica realmente.",
            link: { href: "/pricing", label: "Detalle de tarifas" },
          },
          {
            id: "pedido-minimo",
            q: "¿Cuál es el pedido mínimo?",
            a: "LyoDex no impone ninguno. Cada operador fija el suyo, y los umbrales varían mucho: algunos aceptan unos pocos kilos para desarrollo de producto, otros no encienden una máquina por debajo de varios cientos. El mínimo se indica en la respuesta a su solicitud de cotización.",
          },
          {
            id: "plazos-de-produccion",
            q: "¿Cuáles son los plazos de producción?",
            a: "Un ciclo de liofilización dura normalmente de 24 a 48 horas según el material y su espesor. El plazo real depende mucho más de la cola del operador que del ciclo en sí. LyoDex no fija ningún plazo: cada operador anuncia el suyo en su oferta.",
          },
        ],
      },
      {
        id: "sobre-lyodex",
        title: "Sobre LyoDex",
        items: [
          {
            id: "que-es-lyodex",
            q: "¿Qué es LyoDex?",
            a: "LyoDex es un mercado y un directorio que conecta a las empresas que necesitan liofilización con los operadores que la realizan, en Canadá, Estados Unidos y Europa. La plataforma no posee ningún liofilizador ni procesa material alguno: sirve para encontrar, comparar y contratar operadores, y para publicar datos de precios en un mercado donde casi no existen públicamente.",
            link: { href: "/how-it-works", label: "Cómo funciona" },
          },
          {
            id: "lyodex-liofiliza",
            q: "¿LyoDex liofiliza productos?",
            a: "No. LyoDex no opera ningún equipo ni vende ningún producto terminado. El trabajo lo realizan los operadores independientes listados en la plataforma, cada uno con sus propias instalaciones, certificaciones y tarifas.",
          },
          {
            id: "marca-blanca",
            q: "¿Se puede obtener marca blanca a través de LyoDex?",
            a: "No directamente de LyoDex, pero varios operadores listados lo ofrecen, incluyendo desarrollo de producto y envasado bajo su propia marca. Publique una solicitud describiendo su proyecto y le responderán los operadores capaces de realizarlo.",
            link: { href: "/request", label: "Publicar una solicitud" },
          },
          {
            id: "trabaja-con-empresas-alimentarias",
            q: "¿LyoDex trabaja con empresas alimentarias?",
            a: "Sí, son el público principal de la plataforma: procesadores, marcas de alimentos, productores agrícolas, fabricantes de suplementos y distribuidores. Los compradores particulares también pueden encontrar operadores, aunque la mayoría de los listados trabaja a escala industrial.",
          },
          {
            id: "encontrar-empresa-liofilizacion",
            q: "¿Dónde encontrar una empresa de liofilización?",
            a: "El directorio de LyoDex lista operadores por región, con su ubicación real en el mapa, sus servicios y sus datos de contacto cuando son públicos. La cobertura es más densa en Canadá y Estados Unidos. La consulta es gratuita y sin cuenta.",
            link: { href: "/operator-map", label: "Abrir el mapa de operadores" },
          },
          {
            id: "aparecer-como-operador",
            q: "¿Cómo aparecer como operador?",
            a: "Cree una cuenta de operador y complete su perfil: ubicación, servicios, capacidad y certificaciones. El registro es gratuito. LyoDex no audita instalaciones ni certifica a nadie — el estado de verificación solo refleja lo que se pudo confirmar a partir de fuentes públicas.",
            link: { href: "/register", label: "Crear una cuenta de operador" },
          },
        ],
      },
      {
        id: "datos",
        title: "Datos y fiabilidad",
        items: [
          {
            id: "origen-de-los-datos",
            q: "¿De dónde vienen los datos de precios publicados?",
            a: "Los precios de productos se leen de los catálogos públicos de los comerciantes, registrados con la URL de origen y la fecha de cada observación. Las tarifas de servicio provienen de operadores que las reportaron directamente. Nada se estima: cuando un comerciante no publica el peso neto de un producto, no se calcula ningún precio por kilo para esa línea.",
            link: { href: "/trust", label: "Metodología completa" },
          },
          {
            id: "operadores-verificados",
            q: "¿Están verificados los operadores?",
            a: "Su existencia, ubicación y servicios se confirman a partir de fuentes públicas, y cada ficha indica qué se comprobó. LyoDex no audita ninguna instalación, no inspecciona ninguna certificación en sitio y no garantiza el trabajo de nadie. Verificar las certificaciones sigue siendo responsabilidad del comprador.",
          },
        ],
      },
    ],
  },
};
