import assert from 'node:assert/strict';
export async function assertProgressPolish(page,screenshot){
 await page.locator('.ncc-progress-main-tabs [data-progresssection=summary]').click();
 await page.getByText('Ver mi constancia en detalle',{exact:true}).click();
 const facts=page.locator('.ncc-progress-facts');
 assert.equal(await facts.count(),1);
 await page.locator('[data-progress-highlights="hide"]').click();
 assert.equal(await facts.count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.progressHighlights),'show');
 // Clear in-memory preference to exercise the same storage read used after reload.
 assert.equal(await page.evaluate(async()=>{const v=window.__EFG_VISUAL_QA__;delete v.state.progressHighlightsPreference;await v.render();return v.progressHighlightsVisible();}),false);
 const otherAccount=await page.evaluate(()=>{const v=window.__EFG_VISUAL_QA__,id=v.state.session.user.id;v.state.session.user.id='other-synthetic-user';const show=v.progressHighlightsVisible();v.state.session.user.id=id;return show;});
 assert.equal(otherAccount,true,'Recognition preference must not leak between accounts');
 await page.getByText('Ver mi constancia en detalle',{exact:true}).click();
 await page.locator('[data-progress-highlights="show"]').click();
 assert.equal(await facts.count(),1);
 const geometry=await facts.evaluate(el=>{const box=el.getBoundingClientRect();return {width:box.width,scroll:el.scrollWidth,colors:[...el.querySelectorAll('strong')].map(x=>getComputedStyle(x).color)};});
 assert.ok(geometry.scroll<=geometry.width+1,'Progress cards must fit mobile');
 assert.ok(geometry.colors.every(x=>x==='rgb(240, 241, 231)'));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.__EFG_VISUAL_QA__.notify('Registro guardado · prueba ficticia'));
 const toast=page.locator('#pilot-toast');
 assert.equal(await toast.getAttribute('role'),'status');
 assert.equal(await toast.evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.equal(await toast.evaluate(el=>getComputedStyle(el).color),'rgb(240, 241, 231)');
 await toast.getByRole('button',{name:'Cerrar aviso'}).focus();
 assert.equal(await toast.getByRole('button',{name:'Cerrar aviso'}).evaluate(el=>el.getBoundingClientRect().height>=44),true);
 await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
 await page.keyboard.press('Enter');assert.equal(await toast.isVisible(),false);
 await page.evaluate(()=>window.__EFG_VISUAL_QA__.notify('Segundo aviso ficticio'));
 await toast.getByRole('button',{name:'Cerrar aviso'}).click();assert.equal(await toast.isVisible(),false);
 await page.emulateMedia({reducedMotion:'no-preference'});
}
