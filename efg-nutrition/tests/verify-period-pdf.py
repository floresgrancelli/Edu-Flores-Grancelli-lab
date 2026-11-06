"""Inspect generated local PDFs. Requires pypdf and pdfplumber, not a browser."""
import json
from pathlib import Path
import pypdf
import pdfplumber
root=Path(__file__).resolve().parents[2]/'output/pdf'
models=json.loads((root/'snapshots.json').read_text())
normalize=lambda s: ''.join(s.split())
for filename,key in [('luxury-period-ficticio-10-dias.pdf','normal'),('luxury-period-ficticio-90-dias.pdf','long')]:
 reader=pypdf.PdfReader(root/filename)
 assert not reader.is_encrypted
 action=reader.trailer['/Root'].get('/OpenAction')
 assert not isinstance(action,pypdf.generic.DictionaryObject) or action.get('/S')!='/JavaScript'
 assert not reader.trailer['/Root'].get('/Names',{}).get('/JavaScript')
 fonts=set()
 for page in reader.pages:
  for f in page['/Resources']['/Font'].values():
   font=f.get_object()
   if font.get('/Subtype')!='/Type0': continue
   assert font.get('/ToUnicode'), 'Unicode extraction mapping must be embedded'
   desc=font['/DescendantFonts'][0].get_object()['/FontDescriptor']
   assert desc.get('/FontFile2'), 'TrueType font must be embedded'
   fonts.add(desc['/FontFile2'].get_object().get_data())
 assert len(fonts)==2
 with pdfplumber.open(root/filename) as pdf:
  fragments=[]
  for page in pdf.pages:
   assert page.width>590 and page.height>840
   for c in page.chars:
    assert 0<=c['x0']<=c['x1']<=page.width+.1, (filename,'horizontal clipping',c)
    assert 0<=c['top']<=c['bottom']<=page.height+.1, (filename,'vertical clipping',c)
   # Exclude running header/footer so long paragraphs can span pages.
   fragments.append(page.crop((0,20*72/25.4,page.width,278*72/25.4)).extract_text() or '')
 body=normalize('\n'.join(fragments))
 model=models[key]
 for field in ['conclusion','flexibleNote','studentName','coachName']:
  assert normalize(model[field]) in body, (filename,'lost text',field)
 for phrase in model['focus']:
  assert normalize(phrase) in body
 for food in model['topFoods']:
  assert normalize(food['name']) in body
 for day in model['days']:
  date='/'.join(reversed(day['date'].split('-')))
  assert date in body
 print(f'PASS {filename}: {len(reader.pages)} pages; complete text/dates, embedded Unicode fonts, no page-edge clipping, no active JavaScript.')
