"""NCC 02-03 USDA SR Legacy official-archive capture, public data ONLY.
Downloads one HTTPS file from the official USDA download location, never from
user-supplied URLs. Creates a candidate provenance package, not a food review.
No DB connectivity, database writes, user info or clinical authorization.
"""
import argparse, datetime, hashlib, io, json, pathlib, urllib.request, urllib.parse, zipfile
URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip"
TARGETS={"apple":171688,"oats_raw":173904,"milk_skim":173432,
         "yogurt_greek_light":170894,"spinach_cooked":168463,
         "chicken":171477,"oil":171413,"brownrice":169704,
         "potato":170440,"banana":173944}
NUTRIENTS={1008:("Energy","KCAL"),1003:("Protein","G"),
           1005:("Carbohydrate, by difference","G"),
           1004:("Total lipid (fat)","G"),1079:("Fiber, total dietary","G")}
def sha(data):
    return hashlib.sha256(data).hexdigest()
def capture(output):
    req=urllib.request.Request(URL,headers={"User-Agent":"NCC-Pilot-QA/1.0 (USDA SR Legacy public archive)"})
    with urllib.request.urlopen(req,timeout=45) as response:
        final=urllib.parse.urlsplit(response.geturl())
        if final.scheme!="https" or final.hostname!="fdc.nal.usda.gov":
            raise RuntimeError("Unexpected final download origin")
        if response.status!=200:
            raise RuntimeError("USDA download status "+str(response.status))
        data=io.BytesIO()
        while True:
            chunk=response.read(1024*1024)
            if not chunk: break
            if data.tell()+len(chunk)>32*1024*1024:
                raise RuntimeError("Official archive exceeds expected size limit")
            data.write(chunk)
    payload=data.getvalue()
    if not zipfile.is_zipfile(io.BytesIO(payload)):
        raise RuntimeError("USDA response is not a ZIP archive")
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        entries=[i for i in z.infolist() if i.filename.endswith(".json")
                 and not i.is_dir() and i.file_size>1000000]
        if len(entries)!=1 or entries[0].file_size>300*1024*1024:
            raise RuntimeError("Unexpected SR Legacy ZIP layout")
        entry=entries[0]
        if entry.filename.startswith("/") or ".." in pathlib.PurePosixPath(entry.filename).parts:
            raise RuntimeError("Unsafe ZIP entry")
        contents=json.loads(z.read(entry))
    if isinstance(contents,dict):
        foods=contents.get("SRLegacyFoods")
        if foods is None: foods=contents.get("foods")
    else:
        foods=contents
    if not isinstance(foods,list):
        raise RuntimeError("Unexpected SR Legacy JSON root: manual schema review required")
    byid={}
    requested=set(TARGETS.values())
    for f in foods:
        if not isinstance(f,dict):continue
        fid=f.get("fdcId")
        if fid not in requested:continue
        if fid in byid:raise RuntimeError("Duplicate USDA ID "+str(fid))
        if f.get("dataType")!="SR Legacy":
            raise RuntimeError("Unexpected USDA dataType for "+str(fid))
        arr=f.get("foodNutrients")
        if not isinstance(arr,list):raise RuntimeError("No nutrient array for "+str(fid))
        keyvals={}
        for nutrient_id,(name,unit) in NUTRIENTS.items():
            found=[n for n in arr if isinstance(n,dict) and
                   isinstance(n.get("nutrient"),dict) and
                   n["nutrient"].get("id")==nutrient_id]
            if len(found)!=1:
                raise RuntimeError("Missing/ambiguous nutrient "+str(nutrient_id)+" in "+str(fid))
            n=found[0]
            if n["nutrient"].get("name")!=name or str(n["nutrient"].get("unitName","")).upper()!=unit:
                raise RuntimeError("Nutrient identity/unit mismatch "+str(nutrient_id))
            value=n.get("amount")
            if not isinstance(value,(int,float)) or value<0 or value!=value:
                raise RuntimeError("Invalid amount for "+str(nutrient_id))
            keyvals[str(nutrient_id)]=value
        byid[fid]={"record":f,"nutrients":keyvals}
    if set(byid)!=requested:raise RuntimeError("Official source missing IDs: "+str(sorted(requested-set(byid))))
    out=pathlib.Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest={"status":"CAPTURED_OFFICIAL_ARCHIVE_NOT_REVIEWED",
              "release":"USDA SR Legacy 2018-04",
              "archiveUrl":URL,"archiveSha256":"sha256:"+sha(payload),
              "retrievedAtUTC":now,"sourceJsonFile":entry.filename,
              "foodCount":len(foods),"selected":[],"publishable":False,
              "clinicalEvidence":False,"operatorReviewed":False}
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for foodId,fid in TARGETS.items():
            record=byid[fid]["record"]
            canonical=json.dumps(record,ensure_ascii=False,separators=(",",":"),sort_keys=True).encode()
            name="records/"+str(fid)+".json"
            z.writestr(name,canonical)
            manifest["selected"].append({
             "foodId":foodId,"fdcId":fid,"description":record.get("description"),
             "publicationDate":record.get("publicationDate"),
             "dataType":record.get("dataType"),"nutrientsPer100g":byid[fid]["nutrients"],
             "canonicalRecordSha256":"sha256:"+sha(canonical),
             "archiveProvenance":"from_official_USDA_archive",
             "unit":"g","status":"not_operator_reviewed"})
        z.writestr("manifest.json",json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=True))
    print("OFFICIAL_FDC_CAPTURE "+json.dumps({
        "sourceArchiveSha256":manifest["archiveSha256"],
        "selected":len(manifest["selected"]),
        "foodCountInArchive":manifest["foodCount"],
        "recordNames":[[x["fdcId"],x["description"]] for x in manifest["selected"]],
        "publishable":False},ensure_ascii=False))
if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("--output",required=True)
    args=a.parse_args()
    capture(args.output)
