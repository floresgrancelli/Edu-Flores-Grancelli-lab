// Own-branch QA adapter: reuse the isolated app fixture, extend coverage, never patch app code.
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const source=new URL('./premium-visual-smoke.mjs',import.meta.url);
let text=readFileSync(source,'utf8');
const loop='for(const dest of destinations){';
assert.ok(text.includes(loop));
text=text.replace(loop,'destinations.push("nutritionScience");\n  '+loop);
const metrics='   const metrics=await page.evaluate(()=>{';
assert.ok(text.includes(metrics));
text=text.replace(metrics,`   if(dest==="nutritionScience"){
     if(await page.locator('.ns-library-panel').count()!==8)pageReport.errors.push('Education tab must show eight panels');
     await page.locator('.ns-library-panel').last().scrollIntoViewIfNeeded();
     if(!await page.locator('.ns-library-panel').last().isVisible())pageReport.errors.push('Education final panel unreachable');
     await page.locator('.ns-faq details summary').first().click();
     if(await page.locator('.ns-faq details').first().getAttribute('open')===null)pageReport.errors.push('Education FAQ cannot open');
   }
`+metrics);
const sushi='    const unit=page.locator("#mealEntryMode");';
assert.ok(text.includes(sushi));
text=text.replace(sushi,`    // Persist eight pieces on first save, using actual app handler and fixture adapter.
    const beforeSushi=await page.evaluate(()=>structuredClone(window.__EFG_VISUAL_QA__.state.diary));
    await page.locator('#mealEditorQty').fill('8');
    await page.locator('[data-act="saveSelectedMeal"]').click();
    await page.waitForTimeout(150);
    const sushiRows=await page.evaluate(()=>(window.__EFG_VISUAL_QA__.state.diary.meals.almuerzo||[]).filter(x=>x.id==='sushi_maki_salmon'));
    const savedPiece=sushiRows.at(-1);
    if(!savedPiece||savedPiece.qty!==224||savedPiece.displayQty!==8||!savedPiece.displayUnit.includes('pieza'))pageReport.errors.push('Eight sushi pieces were not persisted as 224 g with piece display: '+JSON.stringify(savedPiece));
    await page.evaluate(async previous=>{const v=window.__EFG_VISUAL_QA__;v.state.diary=previous;await v.render();v.openMealDialog('almuerzo');},beforeSushi);
    await page.locator('[data-mealgroup="prepared"]').click();
    await page.locator('#mealEditorFood').selectOption('sushi_maki_salmon');
`+sushi);
const generated=new URL('./.independent-generated-browser.mjs',import.meta.url);
try{writeFileSync(generated,text);const result=spawnSync(process.execPath,[generated.pathname],{stdio:'inherit',env:process.env});process.exitCode=result.status??1;}
finally{unlinkSync(generated);}
