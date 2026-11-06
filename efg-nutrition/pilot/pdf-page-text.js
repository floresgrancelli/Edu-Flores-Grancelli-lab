// PDF.js 5.6 getTextContent() uses ReadableStream async iteration, unavailable
// in some Safari/WebKit versions. Its public stream+reader API is supported.
// Our generated PDFs are not XFA (disabled by the viewer). Preserve the same
// normalized items/styles/lang without patching vendor code or global prototypes.
export async function readPdfPageText(page,{isCurrent=()=>true,onReader=()=>{}}={}){
 if(!isCurrent())return null;
 const reader=page.streamTextContent().getReader(),detach=onReader(reader);
 const text={items:[],styles:Object.create(null),lang:null};
 try{
  while(true){
   if(!isCurrent()){try{await reader.cancel();}catch{}return null;}
   const {done,value}=await reader.read();
   if(!isCurrent()){try{await reader.cancel();}catch{}return null;}
   if(done)return text;
   text.lang??=value.lang;Object.assign(text.styles,value.styles);text.items.push(...value.items);
  }
 }finally{detach?.();reader.releaseLock();}
}
