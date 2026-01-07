import chromadb
import os
from typing import List
import logging

logger = logging.getLogger(__name__)

# Initialize ChromaDB client with persistence
CHROMADB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chromadb_data")
os.makedirs(CHROMADB_PATH, exist_ok=True)

logger.info(f"ChromaDB path: {CHROMADB_PATH}")

chroma_client = chromadb.PersistentClient(path=CHROMADB_PATH)

def get_collection_name(course_id: int) -> str:
    """Generate a unique collection name for a course."""
    return f"course_{course_id}_materials"

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for better retrieval."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks

def add_material_to_chromadb(course_id: int, material_id: int, content: str, title: str) -> str:
    """Add material content to ChromaDB for RAG."""
    collection_name = get_collection_name(course_id)
    logger.info(f"Adding material {material_id} to collection {collection_name}")
    logger.info(f"Content length: {len(content)} chars")
    
    # Get or create collection
    collection = chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"course_id": str(course_id)}
    )
    
    # Chunk the content
    chunks = chunk_text(content)
    logger.info(f"Created {len(chunks)} chunks")
    
    if not chunks:
        logger.warning("No chunks created from content!")
        return collection_name
    
    # Add chunks to collection
    ids = [f"mat_{material_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"material_id": str(material_id), "title": title, "chunk_index": i} for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas
    )
    
    # Verify
    count = collection.count()
    logger.info(f"Collection now has {count} documents")
    
    return collection_name

def query_materials(course_id: int, query: str, n_results: int = 5) -> List[dict]:
    """Query materials for a course using RAG."""
    collection_name = get_collection_name(course_id)
    logger.info(f"Querying collection {collection_name} for: {query[:50]}...")
    
    try:
        collection = chroma_client.get_collection(name=collection_name)
        count = collection.count()
        logger.info(f"Collection has {count} documents")
    except Exception as e:
        logger.error(f"Collection not found: {e}")
        return []
    
    if count == 0:
        logger.warning("Collection is empty!")
        return []
    
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    
    if not results or not results['documents'] or not results['documents'][0]:
        logger.warning("No results from query")
        return []
    
    logger.info(f"Found {len(results['documents'][0])} results")
    
    # Format results
    formatted = []
    for i, doc in enumerate(results['documents'][0]):
        formatted.append({
            "content": doc,
            "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
            "distance": results['distances'][0][i] if results['distances'] else 0
        })
        logger.info(f"Result {i}: {doc[:100]}...")
    
    return formatted

def delete_material_from_chromadb(course_id: int, material_id: int):
    """Remove material chunks from ChromaDB."""
    collection_name = get_collection_name(course_id)
    
    try:
        collection = chroma_client.get_collection(name=collection_name)
        collection.delete(where={"material_id": str(material_id)})
        logger.info(f"Deleted material {material_id} from {collection_name}")
    except Exception as e:
        logger.error(f"Error deleting material: {e}")

def list_all_collections():
    """Debug utility to list all collections."""
    collections = chroma_client.list_collections()
    return [c.name for c in collections]
