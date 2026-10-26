(() => {
"use strict";
const q=(question,options,correct,hint,symbol)=>({question,options,correct,hint,symbol});
const op=(question,symbol)=>({question,options:["Sí","No","No sé"],kind:"opinion",symbol});
window.EFGGameCatalog={
  groups:[
    {id:"palabras",name:"Preguntas y palabras",icon:"💬",short:"Conversar y descubrir"},
    {id:"figuras",name:"Imágenes y asociaciones",icon:"🖼️",short:"Mirar, reconocer y relacionar"},
    {id:"sonidos",name:"Música y sonidos",icon:"🎵",short:"Escuchar y disfrutar"},
    {id:"recuerdos",name:"Recuerdos y emociones",icon:"🌷",short:"Historias y momentos compartidos"},
    {id:"cotidiano",name:"Vida cotidiana",icon:"🏠",short:"Cosas de todos los días"},
    {id:"entorno",name:"Tiempo y entorno",icon:"🌤️",short:"Lugares, estaciones y viajes"}
  ],
  categories:{
    preguntas:"palabras",refranes:"palabras",adivinanzas:"palabras",contrarios:"palabras",
    imagenes:"figuras",parejas:"figuras",clasificar:"figuras",diferente:"figuras",colores:"figuras",
    musica:"sonidos",sonidos:"sonidos",instrumentos:"sonidos",
    recuerdos:"recuerdos",gustos:"recuerdos",
    compras:"cotidiano",pasos:"cotidiano",objetos:"cotidiano",
    estaciones:"entorno",lugares:"entorno",transportes:"entorno"
  },
  featured:["recuerdos","musica","imagenes","preguntas","parejas","refranes"],
  extra:[
    {id:"adivinanzas",name:"Adivinanzas sencillas",short:"Adivinar con pistas",icon:"💡",color:"sun",questions:[
      q("Tengo hojas, pero no soy un árbol. ¿Qué soy?",["Un libro","Un zapato","Una taza"],0,"Se puede abrir para leer historias.","📖"),
      q("Tengo agujas, pero no coso. ¿Qué soy?",["Una silla","Un reloj","Una puerta"],1,"Sirve para saber la hora.","🕒"),
      q("Tengo cuatro patas y se usa para sentarse. ¿Qué soy?",["Una mesa","Una ventana","Una silla"],2,"Es un mueble donde descansamos.","🪑"),
      q("Se abre cuando llueve y nos protege del agua. ¿Qué es?",["Un paraguas","Una frazada","Un sombrero"],0,"Lo llevamos cuando salimos en un día lluvioso.","☂️")
    ]},
    {id:"contrarios",name:"Palabras opuestas",short:"Encontrar contrarios",icon:"↔️",color:"aqua",questions:[
      q("¿Qué palabra es lo contrario de grande?",["Alto","Pequeño","Largo"],1,"Imaginá el tamaño de una hormiga.","🐜"),
      q("¿Qué palabra es lo contrario de frío?",["Caliente","Rápido","Húmedo"],0,"Pensá en una taza de té recién hecha.","☕"),
      q("¿Qué palabra es lo contrario de arriba?",["Cerca","Lejos","Abajo"],2,"Pensá en el piso y el techo.","↕️"),
      q("¿Qué palabra es lo contrario de abierto?",["Redondo","Cerrado","Liviano"],1,"Pensá en una puerta con llave.","🚪")
    ]},
    {id:"clasificar",name:"¿A qué grupo pertenece?",short:"Agrupar objetos conocidos",icon:"🧺",color:"lime",questions:[
      q("¿Cuál de estos objetos es una fruta?",[{text:"Pera",icon:"🍐"},{text:"Camisa",icon:"👕"},{text:"Cuchara",icon:"🥄"}],0,"Es algo que podemos comer de postre.","🍐"),
      q("¿Cuál de estos objetos es una prenda de vestir?",[{text:"Taza",icon:"☕"},{text:"Campera",icon:"🧥"},{text:"Pelota",icon:"⚽"}],1,"Sirve para abrigarse.","🧥"),
      q("¿Cuál de estos objetos se usa para cocinar?",[{text:"Almohada",icon:"🛏️"},{text:"Paraguas",icon:"☂️"},{text:"Sartén",icon:"🍳"}],2,"Se usa sobre la hornalla.","🍳"),
      q("¿Cuál de estos es un animal?",[{text:"Gato",icon:"🐈"},{text:"Manzana",icon:"🍎"},{text:"Bicicleta",icon:"🚲"}],0,"Es un ser vivo que puede ser una mascota.","🐈")
    ]},
    {id:"diferente",name:"¿Cuál es diferente?",short:"Descubrir el que no pertenece",icon:"🔎",color:"blue",questions:[
      q("¿Cuál de estos NO es una fruta?",[{text:"Naranja",icon:"🍊"},{text:"Manzana",icon:"🍎"},{text:"Zapato",icon:"👞"}],2,"Buscá lo que no se come.","🍊"),
      q("¿Cuál de estos NO sirve para escribir?",[{text:"Lápiz",icon:"✏️"},{text:"Cuchara",icon:"🥄"},{text:"Lapicera",icon:"🖊️"}],1,"Pensá en lo que usamos sobre el papel.","✏️"),
      q("¿Cuál de estos NO es un animal?",[{text:"Perro",icon:"🐕"},{text:"Gato",icon:"🐈"},{text:"Auto",icon:"🚙"}],2,"Buscá lo que tiene ruedas.","🐕"),
      q("¿Cuál de estos NO se usa para tomar bebidas?",[{text:"Vaso",icon:"🥛"},{text:"Taza",icon:"☕"},{text:"Peine",icon:"🪮"}],2,"Pensá en algo que usamos para arreglarnos el pelo.","🥛")
    ]},
    {id:"colores",name:"Colores y formas",short:"Observar figuras y tonos",icon:"🎨",color:"pink",questions:[
      q("¿Cuál de estas figuras es un círculo?",[{text:"Cuadrado",icon:"🟦"},{text:"Círculo",icon:"🔴"},{text:"Triángulo",icon:"🔺"}],1,"Es redonda, sin esquinas.","🔵"),
      q("¿Qué color tiene una banana madura?",["Amarillo","Azul","Violeta"],0,"Pensá en una fruta que se pela.","🍌"),
      q("¿Cuál de estas figuras es un triángulo?",[{text:"Círculo",icon:"🟢"},{text:"Cuadrado",icon:"🟧"},{text:"Triángulo",icon:"🔺"}],2,"Tiene tres lados.","🔺"),
      q("¿De qué color suele ser el pasto sano?",["Rojo","Verde","Azul"],1,"Es el color de muchas hojas.","🌿")
    ]},
    {id:"instrumentos",name:"Instrumentos musicales",short:"Reconocer instrumentos y música",icon:"🎺",color:"sun",questions:[
      q("¿Cuál de estos instrumentos tiene teclas?",[{text:"Guitarra",icon:"🎸"},{text:"Piano",icon:"🎹"},{text:"Tambor",icon:"🥁"}],1,"Se toca con los dedos sobre teclas blancas y negras.","🎹"),
      q("¿Cuál de estos instrumentos se toca golpeándolo?",[{text:"Tambor",icon:"🥁"},{text:"Violín",icon:"🎻"},{text:"Trompeta",icon:"🎺"}],0,"Produce sonido al golpear su superficie.","🥁"),
      q("¿Cuál de estos instrumentos tiene cuerdas?",[{text:"Trompeta",icon:"🎺"},{text:"Flauta",icon:"🪈"},{text:"Guitarra",icon:"🎸"}],2,"Podés tocar sus cuerdas con los dedos.","🎸"),
      q("¿Cuál de estos instrumentos se sopla?",[{text:"Piano",icon:"🎹"},{text:"Trompeta",icon:"🎺"},{text:"Tambor",icon:"🥁"}],1,"El aire ayuda a producir su sonido.","🎺")
    ]},
    {id:"gustos",name:"Lo que me gusta",short:"Charlar sobre preferencias",icon:"❤️",color:"peach",questions:[
      op("¿Te gusta escuchar música por la mañana?","🎵"),
      op("¿Disfrutás mirar fotografías de lugares que visitaste?","📸"),
      op("¿Te gustan las flores?","🌷"),
      op("¿Te gusta tomar un café o un té con alguien querido?","☕"),
      op("¿Te gustan las películas antiguas?","🎬")
    ]},
    {id:"pasos",name:"Paso a paso",short:"Ordenar acciones cotidianas",icon:"👣",color:"mint",questions:[
      q("Antes de tomar mate, ¿qué solemos poner en el mate?",["Yerba","Jabón","Arroz"],0,"Es la planta seca que usamos para preparar mate.","🧉"),
      q("Antes de salir cuando llueve, ¿qué conviene llevar?",["Una pelota","Un paraguas","Una cuchara"],1,"Nos protege del agua.","☂️"),
      q("Para lavarnos las manos, ¿qué usamos?",["Aceite","Harina","Agua y jabón"],2,"Ayuda a limpiarlas.","🧼"),
      q("¿Qué hacemos con una fruta antes de comerla, si se come con cáscara?",["Lavarla","Pintarla","Guardarla en una caja"],0,"Sirve para retirar suciedad.","🍎")
    ]},
    {id:"objetos",name:"¿Para qué sirve?",short:"Usos de objetos familiares",icon:"🪥",color:"aqua",questions:[
      q("¿Para qué usamos un peine?",["Cocinar","Ordenar el pelo","Limpiar el piso"],1,"Se usa frente al espejo.","🪮"),
      q("¿Para qué sirve una cuchara?",["Comer sopa","Abrir una puerta","Escribir"],0,"Se usa en la mesa.","🥄"),
      q("¿Para qué usamos una almohada?",["Regar plantas","Pintar cuadros","Apoyar la cabeza"],2,"La usamos al descansar en la cama.","🛏️"),
      q("¿Para qué sirve un reloj?",["Cortar pan","Ver la hora","Lavar ropa"],1,"Nos ayuda a organizar el día.","⌚")
    ]},
    {id:"estaciones",name:"Las estaciones",short:"Conversar sobre el año",icon:"🌻",color:"lime",questions:[
      q("¿En qué estación del año suele hacer más calor?",["Invierno","Verano","Otoño"],1,"Pensá en los días de playa.","☀️"),
      q("¿En qué estación suelen caer muchas hojas de los árboles?",["Otoño","Primavera","Verano"],0,"Los árboles cambian de color.","🍂"),
      q("¿En qué estación florecen muchas plantas?",["Invierno","Otoño","Primavera"],2,"Llega después del invierno.","🌼"),
      q("¿En qué estación suele hacer más frío en Buenos Aires?",["Verano","Invierno","Primavera"],1,"Es la estación de los abrigos.","🧣")
    ]},
    {id:"lugares",name:"Lugares conocidos",short:"Reconocer sitios familiares",icon:"🏙️",color:"blue",questions:[
      q("¿A cuál de estos lugares vamos a comprar medicamentos?",["Farmacia","Biblioteca","Plaza"],0,"Allí trabajan profesionales farmacéuticos.","💊"),
      q("¿Dónde podemos pedir prestados libros?",["Panadería","Biblioteca","Carnicería"],1,"Hay estantes llenos de libros.","📚"),
      q("¿En qué lugar podemos caminar al aire libre entre árboles?",["Cine","Hospital","Plaza"],2,"Suele tener bancos y senderos.","🌳"),
      q("¿Dónde compramos pan fresco?",["Panadería","Zapatería","Ferretería"],0,"Allí encontramos facturas y pan.","🥖")
    ]},
    {id:"transportes",name:"Viajes y transportes",short:"Reconocer cómo viajamos",icon:"🚂",color:"lav",questions:[
      q("¿Cuál de estos transportes viaja por rieles?",[{text:"Tren",icon:"🚆"},{text:"Colectivo",icon:"🚌"},{text:"Auto",icon:"🚗"}],0,"Tiene estaciones y vías.","🚆"),
      q("¿Con cuál de estos transportes podemos volar?",[{text:"Barco",icon:"🚢"},{text:"Avión",icon:"✈️"},{text:"Bicicleta",icon:"🚲"}],1,"Despega desde un aeropuerto.","✈️"),
      q("¿Cuál de estos transportes navega en el agua?",[{text:"Moto",icon:"🏍️"},{text:"Tren",icon:"🚆"},{text:"Barco",icon:"🚢"}],2,"Viaja por mares o ríos.","🚢"),
      q("¿Cuál de estos transportes suele tener dos ruedas y pedales?",[{text:"Bicicleta",icon:"🚲"},{text:"Auto",icon:"🚗"},{text:"Colectivo",icon:"🚌"}],0,"Se mueve pedaleando.","🚲")
    ]}
  ]
};
})();