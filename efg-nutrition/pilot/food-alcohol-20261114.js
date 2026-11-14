// Reference recipes for diary logging. ABV, sugars and yield are explicit estimates,
// not manufacturer labels. Ethanol energy must NOT be replaced by 4/4/9 macros.
export const ALCOHOL_MODEL={ethanolDensity:0.789,kcalPerGramEthanol:7,reviewed:'2026-11-14',energySource:'https://medlineplus.gov/ency/imagepages/17023.htm'};
// Per 100 ml: alcohol % vol, carbohydrate g, protein g, fat g.
export const DRINK_COMPONENTS={
 whisky:[40,0,0,0],bourbon:[40,0,0,0],vodka:[40,0,0,0],gin:[40,0,0,0],rum:[40,0,0,0],tequila:[40,0,0,0],pisco:[40,0,0,0],cachaca:[40,0,0,0],cognac:[40,0,0,0],
 beer:[5,3.6,.5,0],beer_light:[3.5,2,.3,0],beer_ipa:[6.5,4.5,.5,0],beer_stout:[5,5,.5,0],beer_wheat:[5,4,.5,0],
 red:[13.5,2.6,.1,0],white:[12.5,2.6,.1,0],rose:[12.5,3,.1,0],sweet_red:[12,8,.1,0],sweet_white:[11,10,.1,0],brut:[12,1.2,.1,0],demi:[12,4,.1,0],port:[20,12,.1,0],sherry:[15,2,.1,0],cider:[5,5,0,0],
 fernet:[39,5,0,0],gancia:[14,15,0,0],campari:[25,25,0,0],aperol:[11,25,0,0],cynar:[16.5,20,0,0],vermouth_red:[16,15,0,0],vermouth_dry:[18,3,0,0],
 coffee_liqueur:[20,40,0,0],cream_liqueur:[17,22,3,13],triple_sec:[40,25,0,0],amaretto:[28,35,0,0],peach_liqueur:[20,25,0,0],
 cola:[0,10.6,0,0],zero:[0,0,0,0],lemon_soda:[0,10,0,0],tonic:[0,8.5,0,0],grapefruit_soda:[0,10,0,0],ginger_beer:[0,10,0,0],
 orange:[0,10,.7,.2],pineapple:[0,13,.4,.1],cranberry:[0,12,0,0],lemon:[0,7,.4,.2],lime:[0,8,.4,.1],
 syrup:[0,62,0,0],honey_syrup:[0,65,0,0],grenadine:[0,65,0,0],sugar:[0,100,0,0],
 coconut_cream:[0,54,1,17],cream:[0,3,2,35],egg_white:[0,.7,10.9,.2],strawberry:[0,7.7,.7,.3],espresso:[0,0,.1,0],soda:[0,0,0,0],bitters:[45,5,0,0]
};
const names={whisky:'whisky',bourbon:'bourbon',vodka:'vodka',gin:'gin',rum:'ron',tequila:'tequila',pisco:'pisco',cachaca:'cachaça',cognac:'coñac',fernet:'fernet',gancia:'aperitivo tipo Gancia',campari:'bitter tipo Campari',aperol:'aperitivo tipo Aperol',cynar:'aperitivo tipo Cynar',vermouth_red:'vermut rojo',vermouth_dry:'vermut seco',coffee_liqueur:'licor de café',cream_liqueur:'licor de crema',triple_sec:'triple sec',amaretto:'amaretto',peach_liqueur:'licor de durazno',cola:'cola común',zero:'gaseosa sin azúcar',lemon_soda:'gaseosa lima-limón común',tonic:'tónica común',grapefruit_soda:'gaseosa de pomelo común',ginger_beer:'ginger beer',orange:'jugo de naranja',pineapple:'jugo de ananá',cranberry:'jugo de arándano rojo azucarado',lemon:'jugo de limón',lime:'jugo de lima',syrup:'almíbar (62 g HC/100 ml)',honey_syrup:'jarabe de miel (65 g HC/100 ml)',grenadine:'granadina',sugar:'azúcar',coconut_cream:'crema de coco endulzada',cream:'crema de leche',egg_white:'clara',strawberry:'frutilla triturada',espresso:'café espresso',soda:'soda',bitters:'amargo aromático'};
const sources={penicillin:'penicillin',pisco_sour:'pisco-sour',caipirinha:'caipirinha',caipiroska:'caipirinha',mojito:'mojito',spritz:'spritz',margarita:'margarita',daiquiri:'daiquiri',negroni:'negroni',whisky_sour:'whiskey-sour',pina_colada:'pina-colada',cuba_libre:'cuba-libre',old_fashioned:'old-fashioned',dry_martini:'dry-martini',manhattan:'manhattan',cosmopolitan:'cosmopolitan',espresso_martini:'espresso-martini',sex_on_beach:'sex-on-the-beach',tequila_sunrise:'tequila-sunrise',black_russian:'black-russian',white_russian:'black-russian',americano:'americano'};
// id, name, serving/yield ml, visual family, component quantities (ml; sugar in g), synonyms.
const bases=[
 ['beer_lager','Cerveza rubia lager (5%)',330,'beer','beer',['cerveza','birra','pinta','lata']],
 ['beer_light','Cerveza light (3,5%)',330,'beer','beer_light',['cerveza liviana']],
 ['beer_ipa','Cerveza IPA artesanal (6,5%)',330,'beer','beer_ipa',['ipa','artesanal']],
 ['beer_stout','Cerveza negra stout (5%)',330,'beer','beer_stout',['cerveza negra','porter']],
 ['beer_wheat','Cerveza de trigo (5%)',330,'beer','beer_wheat',['weissbier','wheat']],
 ['wine_red','Vino tinto seco',150,'red','red',['malbec','cabernet','merlot','syrah','pinot noir']],
 ['wine_white','Vino blanco seco',150,'white','white',['chardonnay','sauvignon blanc','torrontes']],
 ['wine_rose','Vino rosado',150,'rose','rose',['rose']],
 ['wine_red_sweet','Vino tinto dulce',150,'red','sweet_red',['vino dulce']],
 ['wine_white_sweet','Vino blanco dulce',150,'white','sweet_white',['cosecha tardia','moscato']],
 ['sparkling_brut','Espumante brut',150,'white','brut',['champagne','champan','prosecco','extra brut']],
 ['sparkling_demi','Espumante demi-sec',150,'white','demi',['champagne dulce']],
 ['wine_port','Vino Oporto',60,'red','port',['porto']],
 ['wine_sherry','Jerez seco',60,'white','sherry',['sherry']],
 ['cider','Sidra',200,'white','cider',['sidra de manzana']],
 ...[['whisky','Whisky / whiskey'],['bourbon','Bourbon'],['vodka','Vodka'],['gin','Gin / ginebra'],['rum','Ron blanco o dorado'],['tequila','Tequila'],['pisco','Pisco'],['cachaca','Cachaça'],['cognac','Coñac / brandy']].map(([id,name])=>[id,name+' (40%)',45,'spirit',id,[id]]),
 ...[['fernet','Fernet solo'],['gancia','Aperitivo tipo Gancia solo'],['campari','Bitter tipo Campari solo'],['aperol','Aperitivo tipo Aperol solo'],['cynar','Aperitivo tipo Cynar solo'],['vermouth_red','Vermut rojo dulce'],['vermouth_dry','Vermut seco'],['coffee_liqueur','Licor de café'],['cream_liqueur','Licor de crema tipo Baileys'],['triple_sec','Licor de naranja / triple sec'],['amaretto','Amaretto']].map(([id,name])=>[id,name,45,'spirit',id,[id.replaceAll('_',' ')]])
];
const cocktails=[
 ['fernet_cola','Fernet con Coca común',250,'long',{fernet:75,cola:175},['fernet con coca','fernet cola']],
 ['fernet_zero','Fernet con Coca Zero',250,'long',{fernet:75,zero:175},['fernet con coca zero','fernet light','fernet sin azucar']],
 ['gancia_lemon','Gancia con lima-limón común',250,'long',{gancia:75,lemon_soda:175},['gancia sprite','gancia seven up','gancia 7up']],
 ['gancia_zero','Gancia con lima-limón Zero',250,'long',{gancia:75,zero:175},['gancia zero','gancia light']],
 ['gancia_soda','Gancia con soda y limón',250,'long',{gancia:75,soda:165,lemon:10},['gancia soda']],
 ['campari_orange','Campari con naranja',200,'long',{campari:50,orange:150},['garibaldi']],
 ['cynar_grapefruit','Cynar con pomelo',250,'long',{cynar:75,grapefruit_soda:175},['cynar pomelo']],
 ['vermouth_soda','Vermut con soda',150,'long',{vermouth_red:75,soda:75},['vermouth soda','vermu']],
 ['gin_tonic','Gin tonic con tónica común',200,'long',{gin:50,tonic:150},['gin tonica']],
 ['gin_tonic_zero','Gin tonic con tónica Zero',200,'long',{gin:50,zero:150},['gin tonic light','gin tonica sin azucar']],
 ['cuba_libre','Cuba libre / ron con Coca común',180,'long',{rum:50,cola:120,lime:10},['ron coca','cuba libre']],
 ['cuba_libre_zero','Cuba libre / ron con Coca Zero',180,'long',{rum:50,zero:120,lime:10},['ron coca zero']],
 ['whisky_cola','Whisky con Coca común',200,'long',{whisky:50,cola:150},['whiscola','whisky cola']],
 ['whisky_zero','Whisky con Coca Zero',200,'long',{whisky:50,zero:150},['whiscola zero']],
 ['vodka_orange','Vodka con naranja / destornillador',200,'long',{vodka:50,orange:150},['screwdriver','destornillador']],
 ['caipirinha','Caipirinha',150,'long',{cachaca:60,lime:30,sugar:16},['caipirina','caipi']],
 ['caipiroska','Caipiroska',150,'long',{vodka:60,lime:30,sugar:16},['caipirosca']],
 ['pisco_sour','Pisco sour (con clara)',160,'cocktail',{pisco:60,lemon:30,syrup:20,egg_white:30,bitters:1},['pisco sour']],
 ['penicillin','Penicillin / Penicilin',150,'spirit',{whisky:67.5,lemon:22.5,honey_syrup:22.5},['penicilin','penicilina','whisky miel jengibre']],
 ['mojito','Mojito',200,'long',{rum:45,lime:20,sugar:8,soda:100},['mojito menta']],
 ['margarita','Margarita clásica',120,'cocktail',{tequila:50,triple_sec:20,lime:15},['margarita']],
 ['daiquiri','Daiquiri clásico',120,'cocktail',{rum:60,lime:20,sugar:10},['daiquiri limon']],
 ['daiquiri_strawberry','Daiquiri de frutilla frozen',250,'cocktail',{rum:50,lime:20,syrup:20,strawberry:80},['daiquiri frutilla','daiquiri frozen']],
 ['negroni','Negroni',120,'spirit',{gin:30,campari:30,vermouth_red:30},['negroni']],
 ['spritz','Aperol spritz',200,'long',{brut:90,aperol:60,soda:30},['spritz','aperol']],
 ['pina_colada','Piña colada',200,'cocktail',{rum:50,coconut_cream:30,pineapple:50},['pina colada','ron coco anana']],
 ['whisky_sour','Whisky sour',120,'cocktail',{bourbon:45,lemon:25,syrup:20},['whiskey sour']],
 ['old_fashioned','Old Fashioned',70,'spirit',{bourbon:45,sugar:4,bitters:2,soda:5},['old fashioned']],
 ['dry_martini','Dry martini',90,'cocktail',{gin:60,vermouth_dry:10},['martini seco']],
 ['manhattan','Manhattan',90,'cocktail',{whisky:50,vermouth_red:20,bitters:1},['manhattan']],
 ['cosmopolitan','Cosmopolitan',130,'cocktail',{vodka:40,triple_sec:15,lime:15,cranberry:30},['cosmo']],
 ['espresso_martini','Espresso martini',140,'cocktail',{vodka:50,coffee_liqueur:30,syrup:10,espresso:30},['expresso martini','martini cafe']],
 ['sex_on_beach','Sex on the Beach',180,'cocktail',{vodka:40,peach_liqueur:20,orange:40,cranberry:40},['sex on the beach']],
 ['tequila_sunrise','Tequila sunrise',200,'long',{tequila:45,orange:90,grenadine:15},['sunrise']],
 ['black_russian','Black Russian',90,'spirit',{vodka:50,coffee_liqueur:20},['ruso negro']],
 ['white_russian','White Russian',120,'spirit',{vodka:50,coffee_liqueur:20,cream:30},['ruso blanco']],
 ['americano','Americano (cóctel)',150,'long',{campari:30,vermouth_red:30,soda:60},['americano cocktail']],
 ['sangria','Sangría (receta estimada)',250,'red',{red:150,orange:50,sugar:10,soda:50},['sangria']],
 ['clerico','Clericó (receta estimada)',250,'white',{white:150,orange:50,strawberry:30,sugar:10},['clerico','clericot']]
];
function makeDrink([id,name,servingMl,beverageKind,recipeParts,aliases],isCocktail){
 const amounts=typeof recipeParts==='string'?{[recipeParts]:servingMl}:recipeParts;
 let ethanol=0,p=0,c=0,f=0;
 for(const [part,amount] of Object.entries(amounts)){
  const [abv,carbs,protein,fat]=DRINK_COMPONENTS[part];
  ethanol+=amount*abv/100*ALCOHOL_MODEL.ethanolDensity;p+=amount*protein/100;c+=amount*carbs/100;f+=amount*fat/100;
 }
 const k=p*4+c*4+f*9+ethanol*7;
 const components=Object.entries(amounts).map(([part,amount])=>amount+(part==='sugar'?' g ':' ml ')+(names[part]||part)).join(', ');
 const sourceUrl=sources[id]?'https://iba-world.com/iba-cocktail/'+sources[id]+'/':ALCOHOL_MODEL.energySource;
 const componentAssumptions=Object.entries(amounts).map(([key])=>`${names[key]||key}: ${DRINK_COMPONENTS[key][0]}% vol, ${DRINK_COMPONENTS[key][1]} g HC/100 ${key==='sugar'?'g':'ml'}`).join('; ');
 return {id:'alc_'+id,name,category:'alcohol',unit:'ml',k:k/servingMl,p:p/servingMl,c:c/servingMl,f:f/servingMl,fi:0,alcohol:true,diaryOnly:true,ethanol_g_per_ml:ethanol/servingMl,servingMl,beverageKind,recipeParts:amounts,aliases,
 sourceType:isCocktail?'recipe_estimate':'generic_estimate',validationStatus:isCocktail?'receta_estimado':'generico_pendiente',sourceUrl,
 source:'ESTIMACIÓN, no etiqueta de fabricante. '+(isCocktail?'Receta de referencia: '+components+'. Rendimiento supuesto '+servingMl+' ml, con dilución del hielo. No cuenta decoración; jengibre/menta aromáticos no cuantificados. ':'Porción de referencia '+servingMl+' ml. ')+
 'Alcohol y HC asumidos: '+componentAssumptions+'. Energía incluye etanol: 7 kcal/g (densidad 0,789 g/ml), además de proteínas, hidratos y grasas. '+(sources[id]?'Proporciones basadas en IBA; nutrientes y rendimiento son estimados, no datos nutricionales IBA. ':'Modelo genérico orientativo; ajustar a marca y preparación. ')+
 'La versión Zero cambia el mezclador; conserva calorías del alcohol y del aperitivo. Micronutrientes no estimados.'};
}
export const ALCOHOL_FOODS=[...bases.map(r=>makeDrink(r,false)),...cocktails.map(r=>makeDrink(r,true))];
// Legacy quantity multiplier is named grams; for liquid rows it stores ml, with unit=ml.
export const ALCOHOL_PORTIONS=Object.fromEntries(ALCOHOL_FOODS.map(f=>[f.id,{grams:f.servingMl,label:(f.beverageKind==='beer'?'vaso/lata':f.beverageKind==='spirit'?'medida':'copa/vaso')+' de '+f.servingMl+' ml'}]));
export const ALCOHOL_ALIASES=Object.fromEntries(ALCOHOL_FOODS.map(f=>[f.id,[...f.aliases,'alcohol','bebidas alcoholicas',...(f.sourceType==='recipe_estimate'?['coctel','cocktail','trago']:[])]]));
