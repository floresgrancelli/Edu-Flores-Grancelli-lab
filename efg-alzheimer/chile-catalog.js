/* EFG Cognitivo · Chile · Actualización 2026-11-05.
 * Cinco actividades, 26 preguntas cada una: 20 nuevas de nivel medio y seis originales.
 * Las preguntas nuevas aparecen primero. Música de Chile se retira del catálogo.
 */
(()=>{
"use strict";
const catalog=window.EFGGameCatalog;
if(!catalog||!Array.isArray(catalog.groups)||!Array.isArray(catalog.extra))return;
const q=(question,options,correct,hint,symbol)=>({question,options,correct,hint,symbol});
const chileGames=[
{id:"chile-sabores",name:"Sabores de Chile",short:"Comidas y recetas · Nivel medio",icon:"🥟",color:"peach",questions:[
// 20 preguntas nuevas de nivel medio.
q("En muchas recetas de la zona central, ¿qué ingrediente da color a la masa de las sopaipillas?",["Zanahoria","Camote","Zapallo"],2,"Es una hortaliza de cáscara firme, usada también en cazuelas.","🥣"),
q("En los porotos con riendas, ¿a qué ingrediente se refiere la palabra riendas?",["Fideos largos","Tiras de carne","Porotos verdes"],0,"Pensá en la forma de algo que también se sirve con salsa.","🍲"),
q("¿Qué ingrediente se suele usar para gratinar la superficie del pastel de jaiba?",["Cebolla salteada","Queso rallado","Papas cocidas"],1,"Se derrite con el calor y forma una cubierta dorada.","🦀"),
q("¿Con qué pescado se prepara el caldillo al que Pablo Neruda dedicó una oda?",["Reineta","Merluza","Congrio"],2,"Tiene un cuerpo alargado y es habitual en la costa chilena.","🐟"),
q("¿Qué verdura distingue al sándwich chileno llamado chacarero?",["Lechuga","Porotos verdes","Palta"],1,"Se agrega cocida y cortada en tiras al pan con carne y tomate.","🥪"),
q("¿Qué hierba fresca se usa habitualmente para preparar el pebre chileno?",["Cilantro","Romero","Menta"],0,"Tiene aroma intenso y sus hojas se parecen a las del perejil.","🌿"),
q("¿Con qué ingrediente se prepara tradicionalmente la salsa dulce de las sopaipillas pasadas?",["Chancaca","Manjar","Mermelada"],0,"Se disuelve un bloque oscuro de azúcar de caña para hacer el almíbar.","🍯"),
q("¿Cómo se llama el guiso chileno de papas y zapallo que se sirve con las verduras parcialmente molidas?",["Cazuela","Carbonada","Charquicán"],2,"Tiene una consistencia espesa, más cercana a un puré que a una sopa.","🥔"),
q("¿Qué hierba se agrega tradicionalmente para perfumar los porotos granados?",["Menta","Albahaca","Romero"],1,"Tiene hojas anchas y también suele acompañar al tomate.","🌱"),
q("¿Qué postre chileno de leche y huevos se cuaja al horno y queda dorado en la superficie?",["Arroz con leche","Leche asada","Sémola con leche"],1,"No necesita granos ni cereal para espesarse: el calor cuaja los huevos.","🍮"),
q("¿Qué pan chileno se reconoce por sus cuatro partes unidas y su corteza crujiente?",["Marraqueta","Hallulla","Dobladita"],0,"En distintas zonas también le dicen pan francés o pan batido.","🥖"),
q("¿Qué pan chileno es redondo y aplanado, y tradicionalmente lleva manteca en su masa?",["Baguette","Marraqueta","Hallulla"],2,"Es un pan individual, de forma parecida a una rueda.","🍞"),
q("¿Qué mezcla forma tradicionalmente la masa del milcao chilote?",["Choclo molido y harina","Arroz cocido y pan","Papas crudas ralladas y papas cocidas"],2,"Se aprovecha un mismo tubérculo preparado de dos maneras.","🥔"),
q("Además de papa cocida, ¿qué ingrediente suele llevar la masa de los chapaleles del curanto?",["Harina de maíz","Harina de trigo","Arroz molido"],1,"Es la harina que se usa habitualmente para hacer pan.","🌾"),
q("¿Qué carne identifica al asado al palo más característico de la Patagonia chilena?",["Cordero","Cerdo","Vacuno"],0,"Es un animal criado tanto por su carne como por su lana.","🔥"),
q("¿Qué combinación lleva el sándwich chileno Barros Luco?",["Jamón y queso","Carne de vacuno y queso","Pollo y palta"],1,"Se sirve caliente y uno de sus ingredientes se derrite sobre la carne.","🥪"),
q("¿Cuál es el ingrediente principal del condimento mapuche llamado merkén?",["Pimienta negra","Ajo tostado","Ají seco y ahumado"],2,"Aporta sabor picante y un aroma a humo.","🌶️"),
q("¿Cómo se llama la preparación tradicional de harina tostada mezclada con agua?",["Ulpo","Muday","Chicha"],0,"No necesita fermentar: se mezcla en una taza y puede quedar espesa.","🥣"),
q("¿Qué sopa chilena lleva pequeños trozos de masa de harina cocidos en el caldo?",["Valdiviano","Pantrucas","Carbonada"],1,"La masa se estira y se corta antes de echarla a la olla.","🍲"),
q("¿Qué dulce se prepara enrollando un bizcocho fino que suele rellenarse con manjar?",["Brazo de reina","Torta de mil hojas","Empolvados"],0,"Al cortarlo, el relleno suele verse como una espiral.","🍰"),
// Se conservan las seis preguntas originales.
q("¿Con qué ingrediente se prepara el pastel de choclo?",["Arroz","Choclo","Papa"],1,"El choclo es el maíz tierno.","🌽"),
q("¿Qué ingrediente lleva una empanada de pino?",["Carne y cebolla","Manzana y crema","Pescado y limón"],0,"Su relleno tradicional se conoce como pino.","🥟"),
q("¿En qué lugar de Chile es tradicional el curanto?",["Valparaíso","Desierto de Atacama","Chiloé"],2,"Pensá en las islas del sur de Chile.","🍲"),
q("¿Qué fruta lleva el mote con huesillo?",["Manzana","Durazno","Plátano"],1,"Se prepara con una fruta deshidratada.","🍑"),
q("¿Cuál de estos ingredientes lleva un completo italiano?",["Palta","Chocolate","Maní"],0,"Su nombre viene de los colores de la bandera italiana.","🌭"),
q("¿Qué ingrediente se usa para preparar humitas?",["Trigo","Papa","Choclo"],2,"Se envuelven tradicionalmente en hojas de la misma planta.","🌽")
]},
{id:"chile-costumbres",name:"Costumbres chilenas",short:"Fiestas y tradiciones · Nivel medio",icon:"🎊",color:"sun",questions:[
// 20 preguntas nuevas de nivel medio.
q("¿Qué tradición chilota reúne a los vecinos para trasladar una casa de un lugar a otro?",["Minga de tiradura","Trilla","Vendimia"],0,"Es una forma de trabajo solidario característica de Chiloé.","🏡"),
q("¿La cosecha de qué fruto se celebra en las fiestas de la vendimia?",["Trigo","Manzanas","Uvas"],2,"La celebración está ligada a las viñas de la zona central.","🍇"),
q("¿Cuál es el objetivo principal al lanzar en la rayuela chilena?",["Embocar una argolla en un poste","Dejar el tejo cerca de una lienza","Derribar piezas de madera"],1,"El lanzamiento se hace hacia una pequeña cancha de tierra o arcilla.","🎯"),
q("¿En qué juego tradicional se intenta encajar una pieza de madera en la punta de un palillo?",["Emboque","Trompo","Luche"],0,"Sus dos piezas permanecen unidas por un cordel.","🧵"),
q("¿Cómo se llama en Chile el juego de casillas dibujadas en el suelo por las que se avanza a saltos?",["Rayuela de tejos","Luche","Emboque"],1,"El recorrido suele marcarse con tiza y se usa una piedra plana.","👣"),
q("¿A quién está dedicada la fiesta religiosa de La Tirana?",["San Pedro","Virgen de la Candelaria","Virgen del Carmen"],2,"A esa imagen se la conoce cariñosamente como la Chinita de la Pampa.","🎊"),
q("¿Qué santo homenajean los pescadores de muchas caletas chilenas con procesiones de embarcaciones?",["San Sebastián","San Pedro","San Antonio"],1,"Según la tradición cristiana, fue pescador antes de ser apóstol.","⛵"),
q("¿Cuándo se celebra tradicionalmente la fiesta de Cuasimodo?",["El domingo siguiente a Pascua","El domingo anterior a Navidad","El primer domingo de septiembre"],0,"Es una celebración que viene después de Semana Santa.","🐎"),
q("¿Con qué momento del año se relaciona el We Tripantu del pueblo mapuche?",["El comienzo del verano","La llegada de la primavera","El solsticio de invierno"],2,"Es el tiempo de las noches más largas, cuando se renueva el ciclo del sol.","☀️"),
q("¿Qué celebración de Rapa Nui reúne competencias y actividades de su tradición ancestral?",["Tapati","Fiesta de La Tirana","Fiesta de San Pedro"],0,"Se realiza en la isla y la comunidad participa en distintas pruebas.","🗿"),
q("¿Para qué se hacía pasar a los animales sobre el trigo en la trilla a yegua suelta?",["Abrir surcos para sembrar","Transportar gavillas al molino","Separar el grano de las espigas"],2,"Se realiza después de cosechar el trigo y antes de molerlo.","🌾"),
q("¿Qué oficio artesanal caracteriza al pueblo de Pomaire?",["El tejido en lana","La alfarería en greda","La cestería en mimbre"],1,"De sus talleres salen ollas, jarros y los conocidos chanchitos.","🏺"),
q("¿Con qué material se hacen tradicionalmente los canastos y muebles de Chimbarongo?",["Lana","Mimbre","Greda"],1,"Es un material vegetal formado por varillas flexibles que se entrelazan.","🧺"),
q("¿Qué material de origen animal utilizan las artesanas de Rari para sus pequeñas figuras tejidas?",["Crin de caballo","Lana de oveja","Cuero de vacuno"],0,"Son fibras muy finas que se entrelazan para crear miniaturas.","🦋"),
q("¿Qué técnica permite crear las escenas de una arpillera chilena?",["Tallar figuras en madera","Modelar una pieza de greda","Coser retazos de tela"],2,"Se trabaja con aguja y materiales de distintos colores.","🪡"),
q("¿Qué acontecimiento recuerda Chile cada 18 de septiembre?",["La fundación de Santiago","La proclamación de la independencia en 1818","La Primera Junta de Gobierno de 1810"],2,"Fue un paso inicial del proceso de independencia, años antes de su proclamación.","🇨🇱"),
q("¿Qué preparación dulce es tradicional en las mesas chilenas durante Navidad?",["Pan de Pascua","Rosca de Reyes","Pan de muerto"],0,"Es una masa especiada que suele llevar frutas confitadas o frutos secos.","🎄"),
q("¿Cómo se llama el sombrero de ala ancha y fibras vegetales asociado al huaso chileno?",["Boina","Chupalla","Bombín"],1,"Se confecciona trenzando materiales vegetales y protege del sol.","👒"),
q("¿Qué avance de una construcción se celebra tradicionalmente en los tijerales?",["La compra del terreno","El comienzo de los cimientos","La instalación de la estructura del techo"],2,"Es el momento en que la casa ya empieza a quedar cubierta.","🏠"),
q("¿Qué localidad chilena se asocia con la cerámica negra decorada con trazos blancos?",["Pomaire","Quinchamalí","Chimbarongo"],1,"Es una tradición alfarera de la región de Ñuble.","🏺"),
// Se conservan las seis preguntas originales.
q("¿En qué mes se celebran las Fiestas Patrias de Chile?",["Julio","Septiembre","Diciembre"],1,"Es un mes de primavera en Chile.","🇨🇱"),
q("¿Qué baile es tradicional en las Fiestas Patrias?",["Cueca","Tango","Flamenco"],0,"Se suele bailar con pañuelos.","💃"),
q("¿Qué objeto se usa tradicionalmente para bailar cueca?",["Paraguas","Sombrilla","Pañuelo"],2,"Se mueve con la mano mientras se baila.","🤍"),
q("¿Qué se suele elevar al cielo durante las Fiestas Patrias?",["Globos aerostáticos","Volantines","Pelotas"],1,"Son cometas de papel que vuelan con viento.","🪁"),
q("¿Cómo se llaman los lugares de celebración con comida y baile?",["Fondas","Bibliotecas","Farmacias"],0,"Se instalan para celebrar las Fiestas Patrias.","🎪"),
q("En Chile, ¿qué significa tomar once?",["Salir a correr","Ir a nadar","Compartir una merienda"],2,"Suele ser a media tarde, con té y pan.","🫖")
]},
{id:"chile-animales",name:"Animales de Chile",short:"Fauna del norte y sur · Nivel medio",icon:"🦌",color:"mint",questions:[
// 20 preguntas nuevas de nivel medio.
q("Aunque se llama monito, ¿a qué grupo pertenece el monito del monte?",["Marsupiales","Primates","Roedores"],0,"Pensá en el grupo al que también pertenecen los canguros.","🐾"),
q("¿Dónde protege el macho de la ranita de Darwin a sus renacuajos?",["Entre las patas","Sobre el lomo","En el saco vocal"],2,"Es una bolsa ubicada cerca de la garganta.","🐸"),
q("¿En qué ambiente suele vivir el chungungo?",["Lagunas del altiplano","Costas rocosas del mar","Bosques de araucarias"],1,"Es una nutria que busca alimento entre las olas.","🐾"),
q("¿Cuál de estos animales es una nutria de los ríos y lagos de la Patagonia chilena?",["Chungungo","Coipo","Huillín"],2,"También se lo conoce como lobito de río; no es un roedor.","🐾"),
q("Aunque se parece a una liebre, ¿qué tipo de mamífero es la vizcacha?",["Roedor","Marsupial","Felino"],0,"Sus dientes delanteros están preparados para roer vegetales.","🐾"),
q("¿Qué ambiente prefiere el ave siete colores?",["Laderas nevadas de montaña","Juncales y totorales","Playas rocosas sin vegetación"],1,"Buscala entre plantas altas que crecen en aguas poco profundas.","🪶"),
q("¿Qué ave chilena se reconoce por un pico largo y curvado hacia abajo?",["Queltehue","Bandurria","Loica"],1,"Suele buscar alimento caminando por praderas y zonas húmedas.","🪶"),
q("¿Qué color caracteriza la cabeza del carpintero negro macho?",["Rojo","Amarillo","Azul"],0,"Es un color intenso que contrasta con las plumas oscuras del cuerpo.","🪶"),
q("¿A qué grupo de aves pertenece el choroy?",["Búhos","Patos","Loros"],2,"Tiene un pico curvo y fuerte, útil para comer semillas.","🪶"),
q("¿Qué ave de los bosques del sur tiene garganta y pecho rojizos, y un canto muy potente?",["Chucao","Choroy","Torcaza"],0,"Suele caminar y saltar entre los arbustos del sotobosque.","🪶"),
q("¿Qué ave de los campos chilenos es conocida por su pecho colorado?",["Diuca","Loica","Tordo"],1,"El color de su pecho se destaca especialmente al verla de frente.","🪶"),
q("¿Dónde suele construir su nido el queltehue?",["En una cavidad de un tronco","Sobre ramas altas","En una depresión del suelo"],2,"Suele criar en terrenos abiertos, cerca de donde camina y busca alimento.","🪺"),
q("En Chile, ¿qué mamífero se conoce también como zorrillo?",["Quique","Chingue","Culpeo"],1,"Tiene franjas blancas sobre el pelaje oscuro y usa un olor intenso para defenderse.","🐾"),
q("¿Cuál de estos animales es un roedor adaptado a nadar en los humedales de Chile?",["Coipo","Huillín","Chungungo"],0,"Se alimenta de vegetales y tiene grandes dientes incisivos anaranjados.","🐾"),
q("¿Qué felino chileno suele tener pelaje manchado y una cola corta y gruesa?",["Puma","Gato andino","Güiña"],2,"Es de tamaño pequeño y se mueve con habilidad entre los árboles.","🐾"),
q("¿Cuál de estas aves de la Patagonia se desplaza corriendo y no puede volar?",["Choique","Caiquén","Bandurria"],0,"Tiene el cuello largo y patas fuertes; también se lo llama ñandú petiso.","🪶"),
q("¿Cómo es el pelaje característico de la chinchilla de cola larga?",["Largo y rizado","Ralo y áspero","Suave y muy denso"],2,"Muchos pelos finos crecen muy juntos y ayudan a conservar el calor.","🐾"),
q("¿Qué pingüino se reconoce por zonas anaranjadas en el cuello y a los lados de la cabeza?",["Pingüino de Magallanes","Pingüino rey","Pingüino de Humboldt"],1,"Su nombre recuerda a una figura de la monarquía.","🐧"),
q("¿Qué pingüino comparte su nombre con la corriente marina de la costa de Chile y Perú?",["Pingüino de Humboldt","Pingüino de penacho amarillo","Pingüino emperador"],0,"La corriente lleva el apellido de un naturalista y recorre el Pacífico sudamericano.","🐧"),
q("Al comer frutos y dejar sus semillas en otros lugares, ¿qué hace el monito del monte?",["Poliniza las flores","Dispersa las semillas","Produce néctar"],1,"Ayuda a que nuevas plantas puedan crecer lejos de la planta original.","🌱"),
// Se conservan las seis preguntas originales.
q("¿Qué pequeño ciervo vive en los bosques del sur de Chile?",["Caballo","Pudú","Llama"],1,"Es uno de los ciervos más pequeños del mundo.","🦌"),
q("¿Cuál de estos animales es un ciervo nativo de los Andes patagónicos?",["Huemul","Cóndor","Gaviota"],0,"Es uno de los animales del escudo chileno.","🦌"),
q("¿Cuál de estas aves puede verse volando sobre los Andes?",["Pingüino","Avestruz","Cóndor"],2,"Es una enorme ave que planea con las alas extendidas.","🦅"),
q("¿Qué ave rosada puede verse en lagunas del norte chileno?",["Cóndor","Flamenco","Picaflor"],1,"Tiene patas largas y plumaje rosado.","🦩"),
q("¿Qué animal de Chile es pariente de la llama?",["Guanaco","Pudú","Zorro"],0,"Es un camélido que habita zonas abiertas.","🦙"),
q("¿Qué gran felino silvestre vive en distintas zonas de Chile?",["Guanaco","Huemul","Puma"],2,"Se parece a un gato muy grande.","🐈")
]},
{id:"chile-lugares",name:"Lugares de Chile",short:"Paisajes y ciudades · Nivel medio",icon:"🏔️",color:"blue",questions:[
// 20 preguntas nuevas de nivel medio.
q("¿A orillas de qué lago se encuentra Puerto Varas?",["Lago Ranco","Lago Llanquihue","Lago Villarrica"],1,"Frutillar y Puerto Octay también están junto a este lago.","🧭"),
q("¿Qué ciudad chilena está asociada a los ríos Calle-Calle y Cau-Cau?",["Valdivia","Temuco","Osorno"],0,"Es la capital de la Región de Los Ríos y tiene una conocida feria fluvial.","🗺️"),
q("¿Qué volcán forma parte del paisaje del Parque Nacional Conguillío?",["Osorno","Villarrica","Llaima"],2,"Está cerca de Melipeuco, en una zona de araucarias de La Araucanía.","🏞️"),
q("¿Qué lago se encuentra en el Parque Nacional Lauca?",["Chungará","Todos los Santos","Pehoé"],0,"Pensá en un lago del altiplano de Arica y Parinacota.","🧭"),
q("¿En qué valle chileno se encuentra la ciudad de Vicuña?",["Valle de Colchagua","Valle de Aconcagua","Valle del Elqui"],2,"Está en la Región de Coquimbo y es conocido por sus cielos para observar estrellas.","🗺️"),
q("Cerca de San Pedro de Atacama, ¿qué atractivo natural es El Tatio?",["Un salar","Un campo de géiseres","Un cañón"],1,"El calor del subsuelo produce columnas de vapor, muy visibles al amanecer.","🏞️"),
q("¿Qué recurso se producía en las antiguas oficinas de Humberstone y Santa Laura?",["Salitre","Cobre","Plata"],0,"Era conocido como el oro blanco de la pampa del norte chileno.","🏛️"),
q("¿Con qué actividad se relaciona la historia del campamento de Sewell?",["La extracción de petróleo","La minería del cobre","La producción de salitre"],1,"El campamento se construyó para los trabajadores de la mina El Teniente.","🏛️"),
q("¿De qué escritor es la conocida casa museo de Isla Negra?",["Vicente Huidobro","Nicanor Parra","Pablo Neruda"],2,"Fue Premio Nobel de Literatura y reunió allí colecciones relacionadas con el mar.","🏛️"),
q("¿Junto a qué paso marítimo se encuentra Punta Arenas?",["Canal de Chacao","Estrecho de Magallanes","Canal Beagle"],1,"Su nombre recuerda a un navegante de la primera vuelta al mundo.","🧭"),
q("¿Cerca de qué ciudad está el arco natural de La Portada?",["Antofagasta","Arica","Iquique"],0,"Es una ciudad costera del norte conocida también como la Perla del Norte.","🗺️"),
q("¿De qué ciudad chilena es símbolo el famoso Morro que domina la costa?",["Iquique","La Serena","Arica"],2,"La ciudad está cerca de la frontera con Perú y es llamada la de la eterna primavera.","🧭"),
q("¿En qué lago se encuentran las Capillas de Mármol?",["Lago Llanquihue","Lago General Carrera","Lago Ranco"],1,"Está en Aysén; las excursiones suelen salir de Puerto Río Tranquilo.","🏞️"),
q("¿Qué volcán se destaca en el paisaje de Pucón?",["Villarrica","Calbuco","Osorno"],0,"Comparte su nombre con el lago junto al que está la ciudad.","🏞️"),
q("¿Cuál es la capital de la Región del Maule?",["Chillán","Rancagua","Talca"],2,"Desde esta ciudad parte el conocido ramal ferroviario hacia Constitución.","🗺️"),
q("¿En qué ciudad está el Faro Monumental, junto a la Avenida del Mar?",["Iquique","La Serena","Viña del Mar"],1,"Es una ciudad vecina de Coquimbo, conocida por sus iglesias de piedra.","🏛️"),
q("¿Qué parque de Aysén es conocido por su Ventisquero Colgante?",["Queulat","Cerro Castillo","Patagonia"],0,"Está cerca de Puyuhuapi; sus deshielos caen hacia la laguna Témpanos.","🏞️"),
q("¿En qué ciudad comienza la Carretera Austral por su extremo norte?",["Valdivia","Coyhaique","Puerto Montt"],2,"Desde allí la ruta sigue hacia Hornopirén y Chaitén.","🗺️"),
q("¿En qué parque nacional están los Saltos del Petrohué?",["Puyehue","Vicente Pérez Rosales","Alerce Andino"],1,"Es un parque de la Región de Los Lagos que también protege el lago Todos los Santos.","🧭"),
q("¿Cuál de estas islas forma parte del archipiélago Juan Fernández?",["Robinson Crusoe","Isla Mocha","Isla Damas"],0,"Su nombre coincide con el protagonista de una famosa novela de aventuras.","🧭"),
// Se conservan las seis preguntas originales.
q("¿Cuál es la capital de Chile?",["Valparaíso","Santiago","Concepción"],1,"Es una gran ciudad junto a la cordillera.","🏙️"),
q("¿Qué ciudad chilena es famosa por sus cerros y su puerto?",["Valparaíso","Calama","Osorno"],0,"Tiene casas de muchos colores y ascensores.","🏘️"),
q("¿Qué desierto se encuentra en el norte de Chile?",["Sahara","Gobi","Atacama"],2,"Es conocido por sus paisajes áridos y cielos estrellados.","🏜️"),
q("¿Qué parque de la Patagonia chilena es famoso por sus torres de roca?",["Conguillío","Torres del Paine","Lauca"],1,"Su nombre incluye la palabra Torres.","🏔️"),
q("¿Qué archipiélago del sur de Chile tiene palafitos y tradiciones propias?",["Chiloé","Rapa Nui","Juan Fernández"],0,"Es conocido por sus casas sobre pilotes y su curanto.","🏡"),
q("¿Qué isla chilena del Pacífico es conocida por sus moáis?",["Chiloé","Isla Mocha","Rapa Nui"],2,"En ella hay enormes esculturas de piedra.","🗿")
]},
{id:"chile-palabras",name:"Palabras chilenas",short:"Expresiones cotidianas · Nivel medio",icon:"💬",color:"aqua",questions:[
// 20 preguntas nuevas de nivel medio.
q("En Chile te dicen: «Voy al tiro». ¿Cuándo piensan ir?",["Cuando termine la semana","Enseguida","Después de almorzar"],1,"La expresión indica que no habrá una larga espera.","⏱️"),
q("Una vecina comenta: «Mañana empiezo una nueva pega». ¿Qué empieza?",["Un trabajo","Un curso","Un viaje"],0,"Pensá en una actividad que suele hacerse para ganarse la vida.","🧰"),
q("En Chile, un cartel dice «Dos lucas». ¿Qué precio indica?",["Doscientos pesos","Veinte mil pesos","Dos mil pesos"],2,"Una luca equivale a mil pesos; acá piden dos.","💵"),
q("En Santiago, alguien avisa: «Llegaré más tarde; hay taco». ¿Qué le retrasa?",["Una congestión de tránsito","Un desvío de la ruta","Una parada para comer"],0,"Pensá en una calle con muchos vehículos que avanzan despacio.","🚗"),
q("En una tienda chilena pedís una polera. ¿Qué prenda buscás?",["Un suéter de cuello alto","Una camisa con botones","Una camiseta de manga corta"],2,"Es una prenda liviana que suele usarse cuando hace calor.","👕"),
q("Si alguien dice «Me voy a poner las chalas», ¿qué calzado elige?",["Botines","Sandalias","Zapatillas"],1,"Es un calzado que deja parte del pie al aire.","👣"),
q("En Chile, un niño usa cotona sobre su ropa. ¿Para qué sirve?",["Para protegerse de la lluvia","Para abrigarse al salir","Para evitar manchar la ropa"],2,"Se puede usar durante tareas escolares o trabajos con materiales.","🎨"),
q("En una casa chilena, ¿qué objeto llaman guatero?",["Una almohada pequeña","Una bolsa para agua caliente","Una manta de lana"],1,"El calor viene de lo que se coloca dentro del objeto.","🛏️"),
q("En Chile presentan a un perro diciendo «Es un quiltro». ¿Qué significa?",["Que es mestizo","Que es un cachorro","Que es muy pequeño"],0,"La palabra se refiere a su origen, no a su edad.","🐕"),
q("Te invitan a vitrinear por el centro. ¿Qué proponen hacer?",["Ir a retirar una compra","Pasear mirando vidrieras","Ir a vender productos"],1,"Podés hacerlo sin llevarte ningún producto.","🛍️"),
q("Al cocinar, alguien pide «un pichintún de sal». ¿Cuánto quiere?",["Una cucharada colmada","Un puñado","Una cantidad muy pequeña"],2,"Es una expresión que se usa cuando alcanza con muy poco.","🧂"),
q("En Chile, una caja de cachureos suele contener…",["Objetos variados que ya no se usan","Productos recién comprados","Documentos de una oficina"],0,"Pensá en cosas que quedaron arrumbadas después de ordenar.","📦"),
q("Alguien propone un paseo y respondés «Me tinca». ¿Qué expresás?",["Que ya hiciste ese paseo","Que preferís otro plan","Que la idea te atrae"],2,"En esta conversación, la respuesta muestra buena disposición hacia la propuesta.","🌳"),
q("En Chile dicen que una vecina es paleteada. ¿Qué cualidad destacan?",["Que está dispuesta a ayudar","Que llega siempre temprano","Que habla muy bajito"],0,"Pensá en alguien que da una mano cuando hace falta.","🤝"),
q("«Hoy vamos a regalonear al perro». ¿Qué quieren hacer?",["Llevarlo a entrenar","Darle mimos y cariño","Cambiarle el alimento"],1,"Se trata de compartir un momento afectuoso.","🐾"),
q("Después de una salida alguien dice «Estuvo bacán». ¿Cómo la evalúa?",["Le pareció demasiado breve","Le pareció muy costosa","Le pareció excelente"],2,"Es una expresión de entusiasmo y aprobación.","✨"),
q("En Chile, decir que una película es fome significa que es…",["Poco entretenida","Difícil de entender","Muy antigua"],0,"La palabra habla del interés que despertó, no de su fecha.","🎬"),
q("Después de explicar algo preguntan «¿Cachaste la idea?». ¿Qué quieren saber?",["Si la anotaste","Si la comprendiste","Si la inventaste"],1,"Buscan confirmar que la explicación quedó clara.","💬"),
q("En una peluquería chilena piden recortar la chasquilla. ¿Qué parte del pelo es?",["El flequillo","Las puntas de atrás","El cabello de la nuca"],0,"Es el pelo que queda más cerca de las cejas.","💇"),
q("En Chile, si un conductor carga bencina, ¿qué está poniendo en el auto?",["Aceite para el motor","Gasolina","Líquido para los frenos"],1,"Sirve como combustible para ciertos motores.","⛽"),
// Se conservan las seis preguntas originales.
q("En Chile, ¿qué significa guagua?",["Abuelo","Bebé","Bicicleta"],1,"Es una palabra cariñosa para un niño muy pequeño.","👶"),
q("¿Cómo se llama también al aguacate en Chile?",["Palta","Frutilla","Zapallo"],0,"Se usa mucho en los completos italianos.","🥑"),
q("En Chile, ¿qué es el choclo?",["Arroz","Trigo","Maíz"],2,"Lo usamos para preparar humitas.","🌽"),
q("En Chile, ¿qué transporte se conoce como micro?",["Tren","Colectivo","Avión"],1,"Lleva pasajeros por la ciudad.","🚌"),
q("¿Qué es un volantín?",["Una cometa","Un sombrero","Un tambor"],0,"Vuela con el viento.","🪁"),
q("En Chile, ¿qué se suele compartir cuando se toma once?",["Un desayuno","Un almuerzo","Una merienda"],2,"Puede incluir té, café y pan.","☕")
]}
];
catalog.groups.unshift({id:"chile",name:"Chile 🇨🇱",icon:"🇨🇱",short:"Comidas, paisajes y recuerdos de Chile"});
chileGames.forEach(g=>{catalog.categories[g.id]="chile";catalog.extra.push(g);});
})();
