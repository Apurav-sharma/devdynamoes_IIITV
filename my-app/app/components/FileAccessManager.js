// components/FileAccessManager.js
import { useEffect, useState } from 'react';
import { isFileSystemAccessSupported } from './utils/fileSystem';

export default function FileAccessManager() {
  const [fsAPISupported, setFsAPISupported] = useState(false);
  
  useEffect(() => {
    // Check if File System Access API is available
    const hasFileSystemAccess = isFileSystemAccessSupported();
    setFsAPISupported(hasFileSystemAccess);
    
    if (hasFileSystemAccess) {
      console.log('Modern File System Access API is available');
    } else {
      console.log('Modern File System Access API is not available, using fallback methods');
    }
  }, []);
  
  // This component doesn't render anything visible but serves as a manager for file operations
  return null;
}