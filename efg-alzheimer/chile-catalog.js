(()=>{
"use strict";
const catalog=window.EFGGameCatalog;
if(!catalog||!Array.isArray(catalog.groups)||!Array.isArray(catalog.extra))return;
const q=(question,options,correct,hint,symbol)=>({question,options,correct,hint,symbol});
const chileGames=[
{id:"chile-sabores",name:"Sabores de Chile",short:"Comidas y recetas de siempre",icon:"🥟",color:"peach",questions:[
q("¿Con qué ingrediente se prepara el pastel de choclo?",["Arroz","Choclo","Papa"],1,"El choclo es el maíz tierno.","🌽"),
q("¿Qué ingrediente lleva una empanada de pino?",["Carne y cebolla","Manzana y crema","Pescado y limón"],0,"Su relleno tradicional se conoce como pino.","🥟"),
q("¿En qué lugar de Chile es tradicional el curanto?",["Valparaíso","Desierto de Atacama","Chiloé"],2,"Pensá en las islas del sur de Chile.","🍲"),
q("¿Qué fruta lleva el mote con huesillo?",["Manzana","Durazno","Plátano"],1,"Se prepara con una fruta deshidratada.","🍑"),
q("¿Cuál de estos ingredientes lleva un completo italiano?",["Palta","Chocolate","Maní"],0,"Su nombre viene de los colores de la bandera italiana.","🌭"),
q("¿Qué ingrediente se usa para preparar humitas?",["Trigo","Papa","Choclo"],2,"Se envuelven tradicionalmente en hojas de la misma planta.","🌽")
]},
{id:"chile-costumbres",name:"Costumbres chilenas",short:"Fiestas, bailes y tradiciones",icon:"🎊",color:"sun",questions:[
q("¿En qué mes se celebran las Fiestas Patrias de Chile?",["Julio","Septiembre","Diciembre"],1,"Es un mes de primavera en Chile.","🇨🇱"),
q("¿Qué baile es tradicional en las Fiestas Patrias?",["Cueca","Tango","Flamenco"],0,"Se suele bailar con pañuelos.","💃"),
q("¿Qué objeto se usa tradicionalmente para bailar cueca?",["Paraguas","Sombrilla","Pañuelo"],2,"Se mueve con la mano mientras se baila.","🤍"),
q("¿Qué se suele elevar al cielo durante las Fiestas Patrias?",["Globos aerostáticos","Volantines","Pelotas"],1,"Son cometas de papel que vuelan con viento.","🪁"),
q("¿Cómo se llaman los lugares de celebración con comida y baile?",["Fondas","Bibliotecas","Farmacias"],0,"Se instalan para celebrar las Fiestas Patrias.","🎪"),
q("En Chile, ¿qué significa tomar once?",["Salir a correr","Ir a nadar","Compartir una merienda"],2,"Suele ser a media tarde, con té y pan.","🫖")
]},
{id:"chile-animales",name:"Animales de Chile",short:"Fauna del norte y del sur",icon:"🦌",color:"mint",questions:[
q("¿Qué pequeño ciervo vive en los bosques del sur de Chile?",["Caballo","Pudú","Llama"],1,"Es uno de los ciervos más pequeños del mundo.","🦌"),
q("¿Cuál de estos animales es un ciervo nativo de los Andes patagónicos?",["Huemul","Cóndor","Gaviota"],0,"Es uno de los animales del escudo chileno.","🦌"),
q("¿Cuál de estas aves puede verse volando sobre los Andes?",["Pingüino","Avestruz","Cóndor"],2,"Es una enorme ave que planea con las alas extendidas.","🦅"),
q("¿Qué ave rosada puede verse en lagunas del norte chileno?",["Cóndor","Flamenco","Picaflor"],1,"Tiene patas largas y plumaje rosado.","🦩"),
q("¿Qué animal de Chile es pariente de la llama?",["Guanaco","Pudú","Zorro"],0,"Es un camélido que habita zonas abiertas.","🦙"),
q("¿Qué gran felino silvestre vive en distintas zonas de Chile?",["Guanaco","Huemul","Puma"],2,"Se parece a un gato muy grande.","🐈")
]},
{id:"chile-lugares",name:"Lugares de Chile",short:"Ciudades, desiertos e islas",icon:"🏔️",color:"blue",questions:[
q("¿Cuál es la capital de Chile?",["Valparaíso","Santiago","Concepción"],1,"Es una gran ciudad junto a la cordillera.","🏙️"),
q("¿Qué ciudad chilena es famosa por sus cerros y su puerto?",["Valparaíso","Calama","Osorno"],0,"Tiene casas de muchos colores y ascensores.","🏘️"),
q("¿Qué desierto se encuentra en el norte de Chile?",["Sahara","Gobi","Atacama"],2,"Es conocido por sus paisajes áridos y cielos estrellados.","🏜️"),
q("¿Qué parque de la Patagonia chilena es famoso por sus torres de roca?",["Conguillío","Torres del Paine","Lauca"],1,"Su nombre incluye la palabra Torres.","🏔️"),
q("¿Qué archipiélago del sur de Chile tiene palafitos y tradiciones propias?",["Chiloé","Rapa Nui","Juan Fernández"],0,"Es conocido por sus casas sobre pilotes y su curanto.","🏡"),
q("¿Qué isla chilena del Pacífico es conocida por sus moáis?",["Chiloé","Isla Mocha","Rapa Nui"],2,"En ella hay enormes esculturas de piedra.","🗿")
]},
{id:"chile-musica",name:"Música de Chile",short:"Artistas y canciones conocidas",icon:"🎸",color:"lav",questions:[
q("¿Quién compuso la canción Gracias a la vida?",["Cecilia","Violeta Parra","Margot Loyola"],1,"Fue una destacada artista y folclorista chilena.","🎶"),
q("¿Qué grupo chileno grabó Todos Juntos?",["Los Jaivas","Quilapayún","Inti-Illimani"],0,"Es un grupo de rock con raíces folclóricas.","🎸"),
q("¿Cuál de estos artistas fue un cantautor chileno?",["Camilo Sesto","Dyango","Víctor Jara"],2,"Fue una figura importante de la música popular chilena.","🎤"),
q("¿Con qué baile se asocia tradicionalmente la música de Fiestas Patrias?",["Vals vienés","Cueca","Samba"],1,"Los bailarines suelen llevar un pañuelo.","💃"),
q("¿Qué grupo chileno grabó Alturas de Machu Picchu?",["Los Jaivas","Los Beatles","ABBA"],0,"Es el mismo grupo de Todos Juntos.","🎼"),
q("¿Cuál de estas artistas chilenas es conocida por recopilar folclore?",["Shakira","Mercedes Sosa","Violeta Parra"],2,"Investigó y difundió canciones populares chilenas.","🎵")
]},
{id:"chile-palabras",name:"Palabras chilenas",short:"Expresiones de todos los días",icon:"💬",color:"aqua",questions:[
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