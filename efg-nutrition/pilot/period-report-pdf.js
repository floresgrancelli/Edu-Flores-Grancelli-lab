// Dispatcher: preserve existing versioned renderers when adding a new design.
export {PERIOD_PDF_RENDERER_VERSION} from './period-report-pdf-version.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
export async function buildPeriodReportPdf(model){
 const version=model?.pdfRendererVersion??'ncc-luxury-period-pdf-v1';
 if(version!=='ncc-luxury-period-pdf-v1')throw Error('Versión de PDF no compatible. No se reemplazará el documento por otro diseño.');
 const renderer=await import('./period-report-pdf-v1.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106');
 return renderer.buildPeriodReportPdf(model);
}
