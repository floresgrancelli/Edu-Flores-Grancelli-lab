// Explicit dispatch: missing version means the original immutable historical v1.
export {PERIOD_PDF_RENDERER_VERSION} from './period-report-pdf-version.js?v=ncc-report-share-return-r12-20261106';
export async function buildPeriodReportPdf(model){
 const version=model?.pdfRendererVersion??'ncc-luxury-period-pdf-v1';
 if(version==='ncc-luxury-period-pdf-v1')return (await import('./period-report-pdf-v1.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106')).buildPeriodReportPdf(model);
 if(version==='ncc-luxury-period-pdf-v2')return (await import('./period-report-pdf-v2.js?v=ncc-weekly-preview-r11-20261106')).buildPeriodReportPdf(model);
 if(version==='ncc-luxury-period-pdf-v3')return (await import('./period-report-pdf-v3.js?v=ncc-report-share-return-r12-20261106')).buildPeriodReportPdf(model);
 throw Error('Versión de PDF no compatible. No se reemplazará el documento por otro diseño.');
}
