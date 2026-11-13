export async function revealIntakeField(page,field){
 const step=['objective','age_years','height_cm','weight_kg','activity_level'].includes(field)?0:['dietary_pattern','eating_window','preferred_foods','disliked_foods'].includes(field)?1:['meal_routine','notes'].includes(field)?2:3;
 const button=page.locator('.ncc-intake-steps [data-intakestep="'+step+'"]');
 if(await button.count())await button.click();
}

// Select the real control in both the guided card form and legacy list form.
export async function selectIntakeChoice(page,field,value){
 await revealIntakeField(page,field);
 const cards=page.locator('input[type=radio][name="coachRelaunch_'+field+'"][value="'+value+'"]');
 if(await cards.count())await cards.check();
 else await page.locator('#coachRelaunch_'+field).selectOption(value);
}
