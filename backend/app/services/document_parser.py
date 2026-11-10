import os
import csv
import json
import ast
import re
import zipfile
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf
import docx
from PIL import Image

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    import pptx
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False

def get_file_category(file_ext: str) -> str:
    """Classifies file extension into high-level knowledge category."""
    ext = file_ext.lower().replace(".", "")
    if ext in ["pdf", "docx", "doc", "txt", "md", "csv", "xlsx", "pptx"]:
        return "document"
    elif ext in ["py", "c", "cpp", "h", "hpp", "java", "js", "jsx", "ts", "tsx", "html", "css", "sql", "json", "yaml", "yml", "xml", "sh", "bat", "ipynb"]:
        return "code"
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        return "hardware"
    elif ext == "zip":
        return "package"
    elif ext in ["link", "github_repo"]:
        return "link"
    return "document"

def parse_document(file_path: Path, file_type: str, relative_path: str = "") -> Dict[str, Any]:
    """
    Parses any supported document, code file, or image into structured text passages.
    Preserves page numbers/line offsets, section headings, and semantic context.
    """
    file_type = file_type.lower().replace(".", "")
    passages: List[Dict[str, Any]] = []
    total_text = ""
    page_count = 1
    metadata: Dict[str, Any] = {"relative_path": relative_path or file_path.name}

    # ==========================
    # 1. PDF Documents
    # ==========================
    if file_type == "pdf":
        try:
            reader = pypdf.PdfReader(str(file_path))
            page_count = len(reader.pages)
            current_offset = 0
            
            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1
                page_text = page.extract_text() or ""
                page_text = page_text.strip()
                if not page_text:
                    continue
                
                paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]
                if not paragraphs:
                    paragraphs = [page_text]
                    
                for para in paragraphs:
                    lines = para.split("\n")
                    first_line = lines[0].strip()
                    heading = first_line[:60] if len(first_line) < 60 else f"Page {page_num} Section"
                    start_offset = current_offset
                    end_offset = start_offset + len(para)
                    
                    passages.append({
                        "page_number": page_num,
                        "section_heading": heading,
                        "text_content": para,
                        "char_offset_start": start_offset,
                        "char_offset_end": end_offset
                    })
                    current_offset = end_offset + 2
                
                total_text += page_text + "\n\n"
        except Exception as e:
            raise ValueError(f"Error extracting PDF: {str(e)}")

    # ==========================
    # 2. DOCX Documents
    # ==========================
    elif file_type == "docx":
        try:
            doc = docx.Document(str(file_path))
            current_heading = "Introduction / Overview"
            current_offset = 0
            
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                if para.style and para.style.name.startswith("Heading"):
                    current_heading = text
                
                start_offset = current_offset
                end_offset = start_offset + len(text)
                
                passages.append({
                    "page_number": 1,
                    "section_heading": current_heading,
                    "text_content": text,
                    "char_offset_start": start_offset,
                    "char_offset_end": end_offset
                })
                current_offset = end_offset + 2
                total_text += text + "\n\n"
        except Exception as e:
            raise ValueError(f"Error extracting DOCX: {str(e)}")

    # ==========================
    # 3. CSV Spreadsheets
    # ==========================
    elif file_type == "csv":
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                rows = list(reader)
            
            if rows:
                headers = rows[0]
                total_rows = len(rows) - 1
                heading = f"CSV Dataset: {file_path.name} ({len(headers)} columns, {total_rows} rows)"
                
                # Format first 40 rows into readable structured text
                sample_lines = [f"Columns: {', '.join(headers)}"]
                for i, row in enumerate(rows[1:41]):
                    sample_lines.append(f"Row {i+1}: " + " | ".join(row[:10]))
                
                text_content = "\n".join(sample_lines)
                total_text = text_content
                passages.append({
                    "page_number": 1,
                    "section_heading": heading,
                    "text_content": text_content,
                    "char_offset_start": 0,
                    "char_offset_end": len(text_content)
                })
        except Exception as e:
            raise ValueError(f"Error parsing CSV: {str(e)}")

    # ==========================
    # 4. XLSX Workbooks
    # ==========================
    elif file_type == "xlsx":
        if not HAS_OPENPYXL:
            raise ValueError("openpyxl library is required for XLSX processing.")
        try:
            wb = openpyxl.load_workbook(str(file_path), data_only=True, read_only=True)
            page_count = len(wb.sheetnames)
            current_offset = 0
            
            for sheet_idx, sheet_name in enumerate(wb.sheetnames):
                sheet = wb[sheet_name]
                rows_text = []
                for r_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                    if r_idx > 50:  # first 50 rows per sheet
                        break
                    cells = [str(c) if c is not None else "" for c in row if c is not None]
                    if cells:
                        rows_text.append(" | ".join(cells))
                
                if rows_text:
                    sheet_content = f"Sheet: {sheet_name}\n" + "\n".join(rows_text)
                    start_offset = current_offset
                    end_offset = start_offset + len(sheet_content)
                    passages.append({
                        "page_number": sheet_idx + 1,
                        "section_heading": f"Spreadsheet Sheet: {sheet_name}",
                        "text_content": sheet_content,
                        "char_offset_start": start_offset,
                        "char_offset_end": end_offset
                    })
                    current_offset = end_offset + 2
                    total_text += sheet_content + "\n\n"
        except Exception as e:
            raise ValueError(f"Error parsing XLSX: {str(e)}")

    # ==========================
    # 5. PPTX Presentations
    # ==========================
    elif file_type == "pptx":
        if not HAS_PPTX:
            raise ValueError("python-pptx library is required for PPTX processing.")
        try:
            prs = pptx.Presentation(str(file_path))
            page_count = len(prs.slides)
            current_offset = 0
            
            for slide_idx, slide in enumerate(prs.slides):
                slide_num = slide_idx + 1
                slide_title = f"Slide {slide_num}"
                texts = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            t = paragraph.text.strip()
                            if t:
                                texts.append(t)
                
                if texts and len(texts[0]) < 80:
                    slide_title = texts[0]
                
                content = "\n".join(texts)
                if content:
                    start_offset = current_offset
                    end_offset = start_offset + len(content)
                    passages.append({
                        "page_number": slide_num,
                        "section_heading": f"Slide {slide_num}: {slide_title}",
                        "text_content": content,
                        "char_offset_start": start_offset,
                        "char_offset_end": end_offset
                    })
                    current_offset = end_offset + 2
                    total_text += content + "\n\n"
        except Exception as e:
            raise ValueError(f"Error parsing PPTX: {str(e)}")

    # ==========================
    # 6. Python Source Code
    # ==========================
    elif file_type == "py":
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                code_text = f.read()
            total_text = code_text
            
            # Use Python AST for deep code understanding
            try:
                tree = ast.parse(code_text)
                module_doc = ast.get_docstring(tree) or ""
                if module_doc:
                    passages.append({
                        "page_number": 1,
                        "section_heading": f"Module Overview: {file_path.name}",
                        "text_content": f"Module docstring:\n{module_doc}",
                        "char_offset_start": 0,
                        "char_offset_end": len(module_doc)
                    })
                
                # Extract classes and functions
                for node in tree.body:
                    if isinstance(node, ast.ClassDef):
                        class_doc = ast.get_docstring(node) or "No docstring"
                        methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                        content = f"Class {node.name} (Methods: {', '.join(methods)}):\nDocstring: {class_doc}"
                        passages.append({
                            "page_number": 1,
                            "section_heading": f"Class: {node.name}",
                            "text_content": content,
                            "char_offset_start": 0,
                            "char_offset_end": len(content)
                        })
                    elif isinstance(node, ast.FunctionDef):
                        fn_doc = ast.get_docstring(node) or "No docstring"
                        args = [a.arg for a in node.args.args]
                        content = f"Function {node.name}({', '.join(args)}):\nDocstring: {fn_doc}"
                        passages.append({
                            "page_number": 1,
                            "section_heading": f"Function: {node.name}",
                            "text_content": content,
                            "char_offset_start": 0,
                            "char_offset_end": len(content)
                        })
            except SyntaxError:
                # Fallback to chunked text if python file has syntax anomalies
                pass
                
            if not passages:
                passages.append({
                    "page_number": 1,
                    "section_heading": f"Source Code: {file_path.name}",
                    "text_content": code_text[:2000],
                    "char_offset_start": 0,
                    "char_offset_end": min(2000, len(code_text))
                })
        except Exception as e:
            raise ValueError(f"Error parsing Python file: {str(e)}")

    # ==========================
    # 7. Jupyter Notebook (.ipynb)
    # ==========================
    elif file_type == "ipynb":
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                nb = json.load(f)
            cells = nb.get("cells", [])
            current_offset = 0
            
            for idx, cell in enumerate(cells):
                cell_type = cell.get("cell_type", "code")
                source = "".join(cell.get("source", [])).strip()
                if not source:
                    continue
                heading = f"Notebook Cell {idx+1} ({cell_type})"
                start_offset = current_offset
                end_offset = start_offset + len(source)
                passages.append({
                    "page_number": idx + 1,
                    "section_heading": heading,
                    "text_content": source,
                    "char_offset_start": start_offset,
                    "char_offset_end": end_offset
                })
                current_offset = end_offset + 2
                total_text += source + "\n\n"
        except Exception as e:
            raise ValueError(f"Error parsing Jupyter Notebook: {str(e)}")

    # ==========================
    # 8. Source Code & Configs (JS, TS, C, Java, SQL, JSON, YAML, etc.)
    # ==========================
    elif file_type in [
        "c", "cpp", "h", "hpp", "java", "js", "jsx", "ts", "tsx",
        "html", "css", "sql", "json", "yaml", "yml", "xml", "sh", "bat", "doc"
    ]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            total_text = content
            
            # Extract key structured chunks
            lines = content.split("\n")
            chunk_size = 50
            for i in range(0, len(lines), chunk_size):
                chunk = "\n".join(lines[i:i + chunk_size])
                start_line = i + 1
                end_line = min(len(lines), i + chunk_size)
                passages.append({
                    "page_number": 1,
                    "section_heading": f"{file_path.name} (Lines {start_line}-{end_line})",
                    "text_content": chunk,
                    "char_offset_start": 0,
                    "char_offset_end": len(chunk)
                })
        except Exception as e:
            raise ValueError(f"Error parsing code/config file: {str(e)}")

    # ==========================
    # 9. Hardware & Diagram Images (PNG, JPG, JPEG, WEBP)
    # ==========================
    elif file_type in ["png", "jpg", "jpeg", "webp"]:
        try:
            with Image.open(str(file_path)) as img:
                width, height = img.size
                format_name = img.format or file_type.upper()
                mode = img.mode
                
            metadata["image_width"] = width
            metadata["image_height"] = height
            metadata["image_format"] = format_name
            
            img_desc = (
                f"Project Hardware / Diagram Asset: {file_path.name}\n"
                f"Dimensions: {width}x{height} px, Format: {format_name}, Color Mode: {mode}.\n"
                f"Category: Circuit Diagram / Hardware System Asset.\n"
                f"Manual component confirmation and tagging available in Hardware Assets tab."
            )
            total_text = img_desc
            passages.append({
                "page_number": 1,
                "section_heading": f"Hardware Diagram: {file_path.name}",
                "text_content": img_desc,
                "char_offset_start": 0,
                "char_offset_end": len(img_desc)
            })
        except Exception as e:
            raise ValueError(f"Error inspecting image file: {str(e)}")

    # ==========================
    # 10. Plain Text & Markdown
    # ==========================
    elif file_type in ["txt", "md"]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            total_text = content
            current_heading = "Document Content"
            current_offset = 0
            
            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            for para in paragraphs:
                if para.startswith("#"):
                    heading_line = para.split("\n")[0]
                    current_heading = heading_line.lstrip("#").strip()
                
                start_offset = current_offset
                end_offset = start_offset + len(para)
                
                passages.append({
                    "page_number": 1,
                    "section_heading": current_heading,
                    "text_content": para,
                    "char_offset_start": start_offset,
                    "char_offset_end": end_offset
                })
                current_offset = end_offset + 2
        except Exception as e:
            raise ValueError(f"Error reading text document: {str(e)}")
    else:
        raise ValueError(f"Unsupported file format: {file_type}")

    return {
        "page_count": max(1, page_count),
        "total_text": total_text.strip(),
        "passages": passages,
        "metadata": metadata
    }

def safe_extract_zip(
    zip_path: Path,
    target_extract_dir: Path,
    max_uncompressed_bytes: int = 150 * 1024 * 1024,
    max_files: int = 500
) -> Dict[str, Any]:
    """
    Safely extracts a ZIP archive:
    - Protects against Zip Slip (path traversal outside target directory)
    - Enforces maximum file count (protects against ZIP bomb)
    - Enforces maximum uncompressed bytes (protects against compression decompression bombs)
    - Skips OS junk files (__MACOSX, .DS_Store, Thumbs.db)
    - Skips and rejects dangerous executable files (.exe, .dll, .so, .bin)
    - Preserves relative folder structure
    """
    if not zipfile.is_zipfile(str(zip_path)):
        raise ValueError("Invalid ZIP archive: file is corrupted or not a valid ZIP format.")

    target_dir_resolved = target_extract_dir.resolve()
    target_dir_resolved.mkdir(parents=True, exist_ok=True)

    extracted_entries: List[Dict[str, Any]] = []
    skipped_entries: List[Dict[str, str]] = []
    total_uncompressed_size = 0

    IGNORED_SYSTEM_NAMES = ["__MACOSX", ".DS_Store", "Thumbs.db", "desktop.ini"]
    DANGEROUS_EXTENSIONS = [".exe", ".dll", ".so", ".bin", ".msi", ".pyd", ".dylib", ".vbs"]

    with zipfile.ZipFile(str(zip_path), "r") as zf:
        infolist = zf.infolist()
        if len(infolist) > max_files:
            raise ValueError(
                f"Archive contains {len(infolist)} items, exceeding the maximum safe limit of {max_files} files."
            )

        for member in infolist:
            # Skip directories themselves
            if member.is_dir():
                continue

            # Check filename for OS junk
            if any(junk in member.filename for junk in IGNORED_SYSTEM_NAMES):
                skipped_entries.append({"path": member.filename, "reason": "Ignored system or metadata file."})
                continue

            # Security check: Zip Slip path traversal
            dest_path = (target_dir_resolved / member.filename).resolve()
            if not str(dest_path).startswith(str(target_dir_resolved)):
                raise ValueError(
                    f"Security violation (Zip Slip detected): '{member.filename}' attempts path traversal outside target directory."
                )

            # Security check: Dangerous binaries
            file_ext = Path(member.filename).suffix.lower()
            if file_ext in DANGEROUS_EXTENSIONS:
                skipped_entries.append({
                    "path": member.filename,
                    "reason": f"Executable or binary format '{file_ext}' rejected for security."
                })
                continue

            # Security check: Decompression bomb check
            total_uncompressed_size += member.file_size
            if total_uncompressed_size > max_uncompressed_bytes:
                raise ValueError(
                    f"Archive exceeds maximum uncompressed size of {max_uncompressed_bytes // (1024*1024)}MB."
                )

            # Safe extraction
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(dest_path, "wb") as dst:
                shutil.copyfileobj(src, dst)

            extracted_entries.append({
                "relative_path": member.filename,
                "file_path": dest_path,
                "file_size": member.file_size,
                "file_type": file_ext.replace(".", ""),
                "name": Path(member.filename).name
            })

    return {
        "total_in_archive": len(infolist),
        "extracted_files": extracted_entries,
        "skipped_files": skipped_entries
    }
