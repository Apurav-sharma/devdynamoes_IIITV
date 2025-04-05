import os
import re
import sys
import json
from pathlib import Path
from collections import defaultdict

def find_linked_files(file_content, current_file_path):
    """
    Parse file content and find all linked local files.
    Returns a list of resolved absolute paths.
    """
    # Get absolute directory of the source file
    current_file = os.path.abspath(current_file_path)
    current_dir = os.path.dirname(current_file)
    
    # Enhanced regex to handle various import formats
    import_pattern = re.compile(r"""
        (?:import|export)\s+                     # import or export keyword
        (?:(?:[\w*\s{},]*)\s+from\s+)?          # optional from clause
        ['"]([^'"]+)['"]                        # the actual path in quotes
    """, re.VERBOSE)
    
    linked_files = []
    linked_paths = []
    
    for match in import_pattern.findall(file_content):
        import_path = match.strip()
        
        # Skip external modules (React, Next.js, Axios, etc.)
        if not import_path.startswith((".", "/")):
            continue
        
        linked_paths.append(import_path)
        
        # Handle absolute imports starting with /
        if import_path.startswith("/"):
            # For absolute imports, you might need to define a project root
            # For now, treat them as relative to current directory
            import_path = "." + import_path
        
        # Resolve path relative to the current file
        abs_path = os.path.normpath(os.path.join(current_dir, import_path))
        
        # Handle directory imports with index files
        if os.path.isdir(abs_path):
            for index_file in ["index.js", "index.jsx", "index.ts", "index.tsx"]:
                index_path = os.path.join(abs_path, index_file)
                if os.path.exists(index_path):
                    linked_files.append((import_path, index_path))
                    break
            continue
        
        # Check if file exists with or without extension
        if os.path.exists(abs_path):
            linked_files.append((import_path, abs_path))
            continue
            
        # Try adding extensions if the file doesn't exist directly
        valid_extensions = [".js", ".jsx", ".ts", ".tsx"]
        for ext in valid_extensions:
            if os.path.exists(abs_path + ext):
                linked_files.append((import_path, abs_path + ext))
                break
    
    return linked_paths, linked_files

def find_api_endpoints(file_content):
    """
    Extract all API endpoints used in axios calls or fetch requests.
    """
    # Pattern for axios calls like axios.get('/api/...')
    axios_pattern = re.compile(r"""
        axios\.(get|post|put|delete|patch)\s*\(\s*
        (?:
            [`'"]([^`'"]+)[`'"]|  # Standard string
            `([^`]+)`             # Template string without variables
        )
    """, re.VERBOSE)
    
    # Pattern for template strings with variables like `/api/user/${id}`
    template_pattern = re.compile(r"""
        axios\.(get|post|put|delete|patch)\s*\(\s*
        `([^`]+)`                 # Template string with variables
    """, re.VERBOSE)
    
    endpoints = []
    
    # Find standard axios calls
    for match in axios_pattern.findall(file_content):
        method, endpoint1, endpoint2 = match
        endpoint = endpoint1 or endpoint2 
        if endpoint and endpoint.startswith('/api/'):
            endpoints.append((method, endpoint))
    
    # Find template string endpoints and extract variables
    for match in template_pattern.findall(file_content):
        method, template = match
        if '${' in template and template.startswith('/api/'):
            # Extract template variables
            var_pattern = re.compile(r'\${([^}]+)}')
            variables = var_pattern.findall(template)
            
            endpoints.append((method, template, variables))
    
    return endpoints

def load_file_content(file_path):
    """Load file content from specified path"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def fetch_linked_files_content(file_path):
    """Fetch content of the main file and all its linked files"""
    content = load_file_content(file_path)
    if not content:
        return {}
    
    # Find linked files
    linked_paths, linked_files = find_linked_files(content, file_path)
    
    # Find API endpoints
    api_endpoints = find_api_endpoints(content)
    
    # Create a dictionary with original file content
    result = {
        file_path: {
            "content": content,
            "import_paths": linked_paths,
            "api_endpoints": api_endpoints
        }
    }
    
    # Add content of linked files
    for import_path, abs_path in linked_files:
        linked_content = load_file_content(abs_path)
        if linked_content:
            # Recursively analyze each linked file as well
            linked_api_endpoints = find_api_endpoints(linked_content)
            result[abs_path] = {
                "content": linked_content,
                "import_path": import_path,
                "api_endpoints": linked_api_endpoints
            }
    
    return result

def normalize_endpoint(endpoint):
    """Normalize endpoint by replacing dynamic parts with placeholders"""
    # Replace dynamic parts like ${id} with :id
    if '${' in endpoint:
        var_pattern = re.compile(r'\${([^}]+)}')
        endpoint = var_pattern.sub(lambda m: f":{m.group(1).split('.')[0]}", endpoint)
    
    # Split by slashes and normalize
    parts = endpoint.strip('/').split('/')
    return '/' + '/'.join(parts)

def find_api_implementation_files(project_root, api_endpoints):
    """
    Find implementation files for API endpoints in a Next.js/Express project.
    Searches in common API directories.
    """
    api_implementations = {}
    print(f"🔍 Searching for API implementations in {project_root}...{api_endpoints}")
    
    # Common API directory patterns in Next.js/Express projects
    api_dirs = [
        "pages/api",  # Next.js API routes
        "app/api",    # Next.js App Router API routes
        "api",        # Express API routes
        "routes/api", # Express API routes alternative
        "src/api",    # Common source folder pattern
        "src/pages/api", # Next.js in src folder
        "src/app/api"    # Next.js App Router in src folder
    ]
    
    # Convert endpoints to a searchable format
    endpoint_patterns = {}
    for endpoint_info in api_endpoints:
        if len(endpoint_info) == 2:
            method, endpoint = endpoint_info
            normalized = normalize_endpoint(endpoint)
        else:
            method, endpoint, variables = endpoint_info
            normalized = normalize_endpoint(endpoint)
        
        # Create a pattern to search for this endpoint
        # Extract the path parts after /api/
        parts = normalized.strip('/').split('/')
        if len(parts) > 1 and parts[0] == 'api':
            route_parts = parts[1:]
            endpoint_patterns['/'.join(route_parts)] = {
                "original": endpoint,
                "normalized": normalized,
                "method": method
            }
    
    # Search for implementation files
    for api_dir in api_dirs:
        api_path = os.path.join(project_root, api_dir)
        if not os.path.exists(api_path):
            continue
        
        # Walk through the API directory
        for root, dirs, files in os.walk(api_path):
            for file in files:
                # Check if it's a JavaScript/TypeScript file
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    file_path = os.path.join(root, file)
                    
                    # Extract relative path from the API directory
                    rel_path = os.path.relpath(file_path, api_path)
                    rel_path_no_ext = os.path.splitext(rel_path)[0]
                    
                    # Handle index files
                    if rel_path_no_ext.endswith('/index'):
                        rel_path_no_ext = rel_path_no_ext[:-6]
                    
                    # Check if this file might implement any of our endpoints
                    for pattern, endpoint_info in endpoint_patterns.items():
                        # Check if the file path matches the endpoint pattern
                        if pattern in rel_path_no_ext or rel_path_no_ext in pattern:
                            # Found a potential match, read the file content
                            content = load_file_content(file_path)
                            if content:
                                # Check if the correct HTTP method is defined
                                method_pattern = re.compile(r'''
                                    (?:
                                        (app|router)\.(get|post|put|delete|patch)|
                                        export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)
                                    )
                                ''', re.VERBOSE | re.IGNORECASE)
                                
                                method_matches = method_pattern.findall(content)
                                
                                # Add to implementations if we found matching methods
                                for method_match in method_matches:
                                    method = method_match[1] or method_match[2]
                                    if method.lower() == endpoint_info["method"].lower():
                                        if endpoint_info["normalized"] not in api_implementations:
                                            api_implementations[endpoint_info["normalized"]] = []
                                        
                                        api_implementations[endpoint_info["normalized"]].append({
                                            "file": file_path,
                                            "content": content,
                                            "method": method
                                        })
    
    return api_implementations

def analyze_api_structure(files_data):
    """
    Analyze the API structure based on endpoints used in the files.
    """
    api_structure = defaultdict(list)
    all_endpoints = []
    
    # Group endpoints by base path
    for file_path, data in files_data.items():
        if "api_endpoints" not in data:
            continue
            
        for endpoint_info in data["api_endpoints"]:
            if len(endpoint_info) == 2:  # Standard endpoint
                method, endpoint = endpoint_info
                parts = endpoint.strip('/').split('/')
                if len(parts) > 1:
                    base_path = f"/{parts[0]}/{parts[1]}"
                    endpoint_data = {
                        "method": method,
                        "endpoint": endpoint,
                        "file": file_path,
                        "dynamic": False
                    }
                    api_structure[base_path].append(endpoint_data)
                    all_endpoints.append(endpoint_data)
            else:  # Template string with variables
                method, endpoint, variables = endpoint_info
                parts = endpoint.strip('/').split('/')
                if len(parts) > 1:
                    base_path = f"/{parts[0]}/{parts[1]}"
                    endpoint_data = {
                        "method": method,
                        "endpoint": endpoint,
                        "variables": variables,
                        "file": file_path,
                        "dynamic": True
                    }
                    api_structure[base_path].append(endpoint_data)
                    all_endpoints.append(endpoint_data)
    
    return api_structure, all_endpoints

def find_project_root(file_path):
    """
    Try to find the project root directory by looking for package.json
    """
    current_dir = os.path.dirname(os.path.abspath(file_path))
    
    # Go up directories until we find package.json or hit the root
    while current_dir and current_dir != os.path.dirname(current_dir):
        if os.path.exists(os.path.join(current_dir, "package.json")):
            return current_dir
        current_dir = os.path.dirname(current_dir)
    
    # If we couldn't find package.json, just use the directory of the file
    return os.path.dirname(os.path.abspath(file_path))

def main():
    # Get file path from command line or use default
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Using the file from the example
        file_path = "../my-app/app/page.js"
    
    # Ensure the file exists
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return
    
    # Fetch all linked files and their content
    files_data = fetch_linked_files_content(file_path)
    
    # Analyze API structure
    api_structure, all_endpoints = analyze_api_structure(files_data)
    
    # Find project root
    project_root = find_project_root(file_path)
    # print(f"\n🔍 Project root: {project_root}")
    
    # Find API implementation files
    api_implementations = find_api_implementation_files(project_root, 
                                                       [(e["method"], e["endpoint"]) if not e.get("dynamic") 
                                                        else (e["method"], e["endpoint"], e.get("variables", [])) 
                                                        for e in all_endpoints])
    
    # Print results
    print(f"\n🔍 Analysis of {file_path}:\n")
    
    # Print main file imports
    main_imports = files_data[file_path]['import_paths']
    print(f"📁 Found {len(main_imports)} local imports:")
    for path in main_imports:
        print(f"  ↪ {path}")
    
    # Print linked files content
    linked_files = [path for path in files_data if path != file_path]
    print(f"\n📂 Resolved {len(linked_files)} linked files:")
    for abs_path in linked_files:
        data = files_data[abs_path]
        print(f"\n✅ {data['import_path']} → {abs_path}")
        print(f"   File size: {len(data['content'])} characters")
        # Print a small preview of the file content
        preview = data['content'][:100].replace('\n', ' ').strip()
        if len(data['content']) > 100:
            preview += "..."
        print(f"   Preview: {preview}")
    
    # Print API endpoints
    all_endpoints_count = sum(len(data.get("api_endpoints", [])) for data in files_data.values())
    print(f"\n🌐 Found {all_endpoints_count} API endpoints across all files:")
    
    for base_path, endpoints in api_structure.items():
        print(f"\n  API Group: {base_path}")
        for endpoint_info in endpoints:
            method = endpoint_info["method"].upper()
            endpoint = endpoint_info["endpoint"]
            file = os.path.basename(endpoint_info["file"])
            # print(file)
            
            if endpoint_info["dynamic"]:
                variables = ", ".join(endpoint_info["variables"])
                print(f"    {method} {endpoint} (dynamic, vars: {variables}) - in {file}")
            else:
                print(f"    {method} {endpoint} - in {file}")
            
            # Print implementation if found
            normalized = normalize_endpoint(endpoint)
            if normalized in api_implementations:
                for impl in api_implementations[normalized]:
                    rel_path = os.path.relpath(impl["file"], project_root)
                    print(f"      ⮕ Implementation: {rel_path}")
                    
                    # Print a preview of the implementation
                    lines = impl["content"].split("\n")
                    # Look for function or route handler
                    handler_lines = []
                    for i, line in enumerate(lines):
                        if re.search(rf'{impl["method"].lower()}', line, re.IGNORECASE) and i < len(lines) - 1:
                            handler_lines = lines[i:min(i+5, len(lines))]
                            break
                    
                    if handler_lines:
                        print("      ⮕ Handler preview:")
                        for line in handler_lines:
                            print(f"        {line.strip()}")
                    else:
                        print("      ⮕ Handler not found in file")
    
    # Print missing files
    missing_files = [
        path for path in main_imports 
        if not any(data.get('import_path') == path for _, data in files_data.items() if _ != file_path)
    ]
    
    if missing_files:
        print(f"\n⚠️ Could not resolve {len(missing_files)} files:")
        for path in missing_files:
            print(f"  ❌ {path}")
    
    # Save results to a JSON file
    result = {
        "main_file": file_path,
        "project_root": project_root,
        "imports": main_imports,
        "linked_files": [{
            "import_path": files_data[abs_path]["import_path"],
            "abs_path": abs_path,
            "preview": files_data[abs_path]["content"][:100]
        } for abs_path in linked_files],
        "api_endpoints": []
    }

    print(api_structure)
    
    for base_path, endpoints in api_structure.items():
        for endpoint_info in endpoints:
            api_info = {
                "method": endpoint_info["method"],
                "endpoint": endpoint_info["endpoint"],
                "file": endpoint_info["file"],
                "dynamic": endpoint_info.get("dynamic", False),
                "implementations": []
            }
            
            if endpoint_info.get("dynamic"):
                api_info["variables"] = endpoint_info["variables"]
            
            normalized = normalize_endpoint(endpoint_info["endpoint"])
            if normalized in api_implementations:
                for impl in api_implementations[normalized]:
                    api_info["implementations"].append({
                        "file": impl["file"],
                        "method": impl["method"],
                        "preview": impl["content"][:200]
                    })
            
            result["api_endpoints"].append(api_info)
    
    with open("api_analysis.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"\n💾 Full analysis saved to api_analysis.json")

if __name__ == "__main__":
    main()