from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.database import get_db
from app.services.excel_parser import parse_and_seed_excel, extract_headers
import json

router = APIRouter()

@router.post("/headers")
async def get_excel_headers(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")
        
    try:
        contents = await file.read()
        headers = extract_headers(contents)
        return {"headers": headers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def upload_excel_file(
    file: UploadFile = File(...), 
    mapping: str = Form(None),
    default_market: str = Form(None),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported.")
        
    try:
        mapping_dict = json.loads(mapping) if mapping else {}
        contents = await file.read()
        
        # Process the excel file in memory
        stats = await parse_and_seed_excel(contents, db, mapping=mapping_dict, default_market=default_market)
        return {"message": "Success", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
