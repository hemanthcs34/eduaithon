import asyncio
import PyPDF2
from app.db.session import SessionLocal
from app import models
from sqlalchemy import select

async def fix_materials():
    async with SessionLocal() as db:
        result = await db.execute(select(models.CourseMaterial))
        materials = result.scalars().all()
        
        for mat in materials:
            print(f"Processing: {mat.title} ({mat.file_path})")
            
            if mat.file_type == 'pdf':
                try:
                    with open(mat.file_path, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        all_text = []
                        for i, page in enumerate(reader.pages):
                            text = page.extract_text()
                            if text:
                                all_text.append(text)
                        
                        full_text = "\n".join(all_text)
                        print(f"  Extracted {len(full_text)} chars from {len(reader.pages)} pages")
                        
                        if full_text.strip():
                            mat.content_text = full_text
                        else:
                            print("  WARNING: No text extracted - PDF might be scanned/image-based")
                except Exception as e:
                    print(f"  Error: {e}")
            
            elif mat.file_type in ['txt', 'md']:
                try:
                    with open(mat.file_path, 'r', encoding='utf-8') as f:
                        mat.content_text = f.read()
                        print(f"  Read {len(mat.content_text)} chars")
                except Exception as e:
                    print(f"  Error: {e}")
        
        await db.commit()
        print("\nDone! Materials updated.")

if __name__ == "__main__":
    asyncio.run(fix_materials())
