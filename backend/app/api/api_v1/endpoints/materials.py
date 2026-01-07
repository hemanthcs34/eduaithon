from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select
from app import models, schemas
from app.api import deps
from app.models.user import UserRole
from app.core.rag import add_material_to_chromadb, delete_material_from_chromadb
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads/materials"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text content from uploaded file."""
    try:
        if file_type in ['txt', 'md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif file_type == 'pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    return text
            except ImportError:
                # PyPDF2 not installed, return empty
                return ""
        else:
            return ""
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""

@router.post("/{course_id}/materials", response_model=schemas.CourseMaterial)
async def upload_material(
    course_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload course material (PDF, TXT, MD) for RAG-based chatbot and quizzes.
    """
    if current_user.role.value != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload materials")
    
    # Verify course ownership
    result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    
    # Get file extension
    filename = file.filename or "unknown.txt"
    file_ext = filename.rsplit('.', 1)[-1].lower()
    
    if file_ext not in ['pdf', 'txt', 'md']:
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and MD files are supported")
    
    # Save file
    course_dir = os.path.join(UPLOAD_DIR, str(course_id))
    os.makedirs(course_dir, exist_ok=True)
    file_path = os.path.join(course_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract text content
    content_text = extract_text_from_file(file_path, file_ext)
    
    # Create material record
    material = models.CourseMaterial(
        course_id=course_id,
        title=title,
        file_path=file_path,
        file_type=file_ext,
        content_text=content_text
    )
    db.add(material)
    await db.flush()
    
    # Add to ChromaDB for RAG
    if content_text:
        print(f"Adding material to ChromaDB: course={course_id}, mat_id={material.id}, content_len={len(content_text)}")
        collection_name = add_material_to_chromadb(course_id, material.id, content_text, title)
        material.chromadb_collection = collection_name
        print(f"Material added to collection: {collection_name}")
    else:
        print(f"No content extracted from material!")
    
    await db.commit()
    await db.refresh(material)
    return material

@router.get("/{course_id}/materials", response_model=List[schemas.CourseMaterial])
async def get_materials(
    course_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Get all materials for a course.
    """
    result = await db.execute(
        select(models.CourseMaterial).where(models.CourseMaterial.course_id == course_id)
    )
    return result.scalars().all()

@router.delete("/{course_id}/materials/{material_id}")
async def delete_material(
    course_id: int,
    material_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a material.
    """
    if current_user.role.value != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete materials")
    
    result = await db.execute(
        select(models.CourseMaterial).where(
            models.CourseMaterial.id == material_id,
            models.CourseMaterial.course_id == course_id
        )
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Remove from ChromaDB
    try:
        delete_material_from_chromadb(course_id, material_id)
    except Exception as e:
        print(f"Error deleting from ChromaDB: {e}")
    
    # Delete file
    try:
        if os.path.exists(material.file_path):
            os.remove(material.file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    await db.delete(material)
    await db.commit()
    return {"status": "deleted"}

@router.get("/{course_id}/materials/{material_id}/download")
async def download_material(
    course_id: int,
    material_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Download a material file.
    """
    from fastapi.responses import FileResponse
    
    result = await db.execute(
        select(models.CourseMaterial).where(
            models.CourseMaterial.id == material_id,
            models.CourseMaterial.course_id == course_id
        )
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not os.path.exists(material.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    filename = os.path.basename(material.file_path)
    return FileResponse(
        material.file_path,
        filename=filename,
        media_type="application/octet-stream"
    )
