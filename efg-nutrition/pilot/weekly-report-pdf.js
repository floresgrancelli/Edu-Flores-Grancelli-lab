// Preserve v1 for every shared snapshot. Never replace an old layout in place.
export const WEEKLY_PDF_RENDERER_VERSION='ncc-luxury-weekly-pdf-v1';
export async function buildWeeklyReportPdf(model){
 if(model?.kind==='efg_legacy_weekly_text_v1'){
  const legacy=await import('./weekly-legacy-pdf.js?v=ncc-weekly-preview-r11-20261106');
  return legacy.buildLegacyWeeklyPdf(model);
 }
 const version=model?.pdfRendererVersion??WEEKLY_PDF_RENDERER_VERSION;
 if(version!==WEEKLY_PDF_RENDERER_VERSION)throw Error('Versión de PDF no compatible. No se reemplazará el documento por otro diseño.');
 const renderer=await import('./weekly-report-pdf-v1.js?v=ncc-weekly-preview-r11-20261106');
 return renderer.buildWeeklyReportPdf(model);
}
