export async function revealIntakeField(page,field){
 const step=['objective','age_years','height_cm','weight_kg','activity_level'].includes(field)?0:['dietary_pattern','eating_window','preferred_foods','disliked_foods'].includes(field)?1:['meal_routine','notes'].includes(field)?2:3;
 const button=page.locator('.ncc-intake-steps [data-intakestep="'+step+'"]');
 if(await button.count())await button.click();
}
