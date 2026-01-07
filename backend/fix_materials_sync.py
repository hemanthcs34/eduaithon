import sqlite3
import PyPDF2
import os

# Connect to SQLite directly (no async issues)
db_path = "coursetwin.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all materials
cursor.execute("SELECT id, title, file_path, file_type FROM course_materials")
materials = cursor.fetchall()

print(f"Found {len(materials)} materials")

for mat_id, title, file_path, file_type in materials:
    print(f"\nProcessing: {title} ({file_path})")
    
    if not os.path.exists(file_path):
        print(f"  File not found!")
        continue
    
    content_text = ""
    
    if file_type == 'pdf':
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                all_text = []
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        all_text.append(text)
                content_text = "\n".join(all_text)
                print(f"  Extracted {len(content_text)} chars from {len(reader.pages)} pages")
        except Exception as e:
            print(f"  Error: {e}")
    
    elif file_type in ['txt', 'md']:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content_text = f.read()
                print(f"  Read {len(content_text)} chars")
        except Exception as e:
            print(f"  Error: {e}")
    
    if content_text.strip():
        cursor.execute("UPDATE course_materials SET content_text = ? WHERE id = ?", (content_text, mat_id))
        print(f"  Updated!")
    else:
        print(f"  No content to update")

conn.commit()
conn.close()
print("\nDone!")
