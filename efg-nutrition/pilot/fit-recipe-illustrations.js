// Ilustraciones vectoriales originales de platos TERMINADOS, sin dependencias externas.
// Una composición distinta por receta; SVG inline nítido en iPhone, Android y desktop.
const E=(x,y,rx,ry,fill,stroke="none",sw=1)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const C=(x,y,r,fill,stroke="none",sw=1)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const P=(d,fill,stroke="none",sw=1)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>';
const R=(x,y,w,h,rx,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'"/>';
const leaf=(x,y,rot=0,color="#5d9466")=>'<g transform="translate('+x+' '+y+') rotate('+rot+')">'+P("M0 0 Q-12 -21 2 -29 Q18 -15 0 0",color)+P("M0 0 L2 -22","none","#d5e6ad",1.5)+'</g>';
const plate=()=>E(240,134,151,97,"#fffdf8","#ece7de",5)+E(240,134,126,77,"#faf6ee","#f0ebe3",2);
const sprinkle=(points,color="#815a39",r=2)=>points.map(([x,y])=>C(x,y,r,color)).join("");
const bg={
 "budin-edu":["#f4e8db","#ecd6bd"],"budin-whey":["#f1e3da","#e7ccba"],
 pancakes:["#f7e9cf","#e8d2b1"],omelette:["#e5f0dc","#d3e5ce"],
 overnight:["#e5eff0","#d0e3df"],chia:["#eee6f2","#ded6e8"],
 muffins:["#e7efe2","#d4e3d0"],"chicken-medallions":["#f1e5d8","#e4d1bd"],
 "hake-medallions":["#e3edf0","#cedfe5"],"chicken-bowl":["#e4ece0","#d1e0cf"],
 tortilla:["#f3e7cf","#e6d4b5"],"tuna-bowl":["#e0eee5","#cce2d5"]
};
const art={
 "budin-edu":()=>plate()+
  E(240,175,95,18,"#e6ddd0")+
  P("M155 147 L166 95 Q199 76 250 95 L268 148 Q214 169 155 147","#a46d42","#895a36",3)+
  P("M166 96 Q204 77 251 95 L262 114 Q210 103 163 116 Z","#cb965a")+
  P("M205 158 L227 112 L289 111 L303 158 Q253 178 205 158","#c5915c","#8c5d39",3)+
  P("M227 112 Q256 99 289 111 L303 130 Q261 118 218 134 Z","#e8bd7c")+
  P("M269 171 L286 125 L343 125 L355 167 Q314 185 269 171","#d1a06b","#996b44",3)+
  sprinkle([[178,113],[199,123],[218,145],[252,133],[274,145],[292,151],[321,145],[331,158]],"#7b4935",3)+
  P("M119 163 Q131 142 149 147 Q156 166 142 180 Q125 183 119 163","#e6b34d")+
  leaf(139,150,-30),
 "budin-whey":()=>plate()+
  P("M150 153 L164 102 Q213 77 269 105 L281 155 Q221 175 150 153","#a77a50","#8d5f40",3)+
  P("M166 104 Q215 83 266 105 L275 120 Q217 106 160 121 Z","#e5bd85")+
  P("M213 170 L236 120 L309 119 L326 166 Q273 183 213 170","#d8aa72","#9b704b",3)+
  P("M235 120 Q274 109 309 119 L319 136 Q276 125 227 139 Z","#f0d4a5")+
  P("M278 180 L295 137 L355 139 L364 176 Q321 190 278 180","#c99a6a","#9a714d",2)+
  sprinkle([[183,125],[210,136],[254,148],[289,156],[320,165]],"#c06c56",4)+
  P("M167 93 Q192 80 214 92 M226 94 Q243 83 265 94","none","#fff4dd",5)+
  leaf(351,143,48),
 pancakes:()=>plate()+
  E(237,170,105,22,"#d39b59","#a36d38",3)+E(236,157,106,24,"#e8b66c","#b47d44",3)+
  E(237,144,101,23,"#dca75d","#b67b3b",3)+E(238,131,98,23,"#e9bf7b","#b37c45",3)+
  E(236,118,93,22,"#efc985","#b37c45",3)+
  E(213,111,20,10,"#f5e1a5","#e4c27d",2)+E(263,113,21,10,"#f5e1a5","#e4c27d",2)+
  C(213,110,5,"#a97c3b")+C(264,111,5,"#a97c3b")+
  P("M241 99 Q251 112 241 125 Q233 137 244 148","none","#a86b37",5)+
  sprinkle([[178,134],[208,146],[285,140],[266,165]],"#b78a53",3),
 omelette:()=>plate()+
  P("M130 145 Q156 76 250 91 Q334 104 349 154 Q247 190 130 145","#f2c758","#c89936",4)+
  P("M138 147 Q235 119 343 155 Q241 185 138 147","#eeb747","#c99630",2)+
  P("M152 147 Q240 133 325 155","none","#ffdf81",4)+
  C(182,130,13,"#c75a45")+C(301,138,14,"#d96049")+C(290,162,9,"#c9543f")+
  leaf(196,131,60)+leaf(282,128,-30)+leaf(265,166,40)+
  sprinkle([[207,149],[227,155],[252,144],[276,153]],"#b27e2f",2),
 overnight:()=>E(241,191,91,18,"#d3d8d4")+
  R(169,53,145,146,22,"#e7eff0")+R(176,66,131,122,16,"#f4eee0")+
  R(178,109,127,75,10,"#d6b892")+R(178,86,127,30,9,"#f6f3e8")+
  E(242,88,63,13,"#e3d5b7")+ 
  [[196,87],[220,95],[250,84],[275,96],[294,86 ]].map(([x,y])=>C(x,y,8,"#d7a96e")).join("")+ 
  [[205,78],[235,85],[268,77],[287,85 ]].map(([x,y])=>C(x,y,7,"#d8a94e")).join("")+
  sprinkle([[191,126],[211,144],[245,131],[271,159],[290,141]],"#9b794d",3)+
  P("M174 57 Q244 40 308 57","none","#fff",6)+leaf(300,88,45),
 chia:()=>E(239,194,86,16,"#cbd5d7")+
  R(166,54,148,145,20,"#edf2f3")+R(175,65,130,120,13,"#d4c5b5")+
  R(175,70,130,35,13,"#f3e7cf")+E(239,72,63,12,"#f9f0db")+
  sprinkle([[193,122],[215,139],[244,121],[272,148],[291,125],[203,165],[257,166],[286,172]],"#625c5a",3)+
  E(208,67,19,9,"#f5d27d","#d3ae55",2)+E(245,64,20,9,"#f5d27d","#d3ae55",2)+
  E(282,68,18,9,"#f5d27d","#d3ae55",2)+
  C(208,67,4,"#bd9848")+C(245,64,4,"#bd9848")+C(282,68,4,"#bd9848")+
  leaf(288,55,35),
 muffins:()=>plate()+ 
  [[164,112],[232,97],[299,118]].map(([x,y])=>
   P("M"+(x-27)+" "+(y+18)+" L"+(x-21)+" "+(y+68)+" Q"+x+" "+(y+80)+" "+(x+21)+" "+(y+68)+" L"+(x+27)+" "+(y+18)+" Z","#d7a26c","#ac794b",2)+
   E(x,y+17,35,21,"#e9bc7c","#bb8b54",2)+E(x,y+6,31,18,"#e7c98e","#b68d59",2)+
   sprinkle([[x-12,y+5],[x+12,y+11],[x,y-2]],"#5f9365",3)).join("")+
  leaf(344,154,35),
 "chicken-medallions":()=>plate()+ 
  [[179,122],[249,115],[296,153]].map(([x,y])=>E(x,y,46,31,"#b97b48","#966139",3)+E(x-4,y-7,36,20,"#d6a16a")+sprinkle([[x-18,y-7],[x+11,y+4],[x+16,y-12]],"#8b5d3a",2)).join("")+
  leaf(152,170,-40)+leaf(168,185,35)+leaf(338,116,45)+
  C(332,168,11,"#d05c43")+C(346,175,9,"#e17a54"),
 "hake-medallions":()=>plate()+ 
  [[174,126],[245,112],[302,148]].map(([x,y])=>E(x,y,45,30,"#e1b778","#b99156",3)+E(x-4,y-7,34,19,"#f1d59c")+sprinkle([[x-13,y-5],[x+8,y+4],[x+13,y-9]],"#9b9b63",2)).join("")+
  P("M124 168 Q146 146 165 166 L150 185 Z","#f0d46e","#dfb751",2)+P("M126 168 L150 181","none","#fff0a5",3)+
  leaf(334,110,30)+leaf(350,121,-20),
 "chicken-bowl":()=>E(240,184,139,47,"#c8d6cf")+E(240,131,145,82,"#fafafa","#d8e2dc",5)+
  E(240,133,122,66,"#d3e0cf")+
  E(183,132,56,43,"#eee2c6")+sprinkle([[151,126],[169,114],[191,139],[208,124]],"#f9f6e8",3)+ 
  [[255,108],[280,125],[252,145],[289,148]].map(([x,y])=>R(x-17,y-10,34,20,7,"#c89c65")).join("")+
  C(306,112,16,"#d35b4c")+C(315,146,15,"#d35b4c")+C(295,163,12,"#e57d64")+
  leaf(232,105,40)+leaf(228,157,-40)+leaf(341,130,25),
 tortilla:()=>plate()+
  P("M134 149 Q166 94 241 98 Q309 101 341 150 Q260 185 134 149","#e6bd63","#bc9148",3)+
  P("M241 98 L270 153 L341 150 Q307 105 241 98","#f3d184","#c69e56",2)+
  P("M241 98 L270 153 L203 174 Q165 171 134 149 Z","#efc874","#bd9147",2)+ 
  [[180,143],[211,121],[256,131],[292,150],[234,160]].map(([x,y])=>E(x,y,10,7,"#f5e0a1")).join("")+
  leaf(341,167,45),
 "tuna-bowl":()=>E(240,187,143,48,"#c9d9d0")+E(240,130,148,83,"#f8f9f4","#dce5de",5)+
  E(240,131,127,66,"#a4c49c")+ 
  [[168,121],[194,143],[226,105],[266,146],[300,112],[321,149]].map(([x,y])=>C(x,y,14,"#ad895d","#836e4b",2)+C(x+3,y-3,5,"#c5a579")).join("")+
  P("M178 117 Q205 93 227 111 L211 132 Q188 133 178 117","#e7d5b3","#c8b28e",2)+
  P("M241 150 Q265 124 289 144 L275 166 Q254 172 241 150","#ead9b8","#c8b28e",2)+
  C(304,158,13,"#dc6c53")+C(160,150,11,"#d85b4b")+
  leaf(224,161,35)+leaf(283,101,-30)
};
export function fitRecipeIllustration(id){
 const colors=bg[id]||["#e8f0e9","#d6e6db"];
 const drawing=art[id]?art[id]():plate();
 // No remote assets, no font dependence and no user-generated markup.
 return '<svg class="efg-fit-illustration" viewBox="0 0 480 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+
 '<defs><linearGradient id="efg-recipe-bg-'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+colors[0]+'"/><stop offset="1" stop-color="'+colors[1]+'"/></linearGradient></defs>'+
 R(0,0,480,250,22,'url(#efg-recipe-bg-'+id+')')+
 E(240,216,146,16,"#9d9a8640")+
 drawing+
 '</svg>';
}
